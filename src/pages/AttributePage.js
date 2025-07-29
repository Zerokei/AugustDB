import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, ATTRIBUTES } from '../lib/supabase';
import { canIncrementAttribute, getDiscipleGroup, getGroupDisplayName, getGroupColor, DISCIPLE_GROUPS, DISCIPLE_CONFIG } from '../lib/discipleConfig';
import { ArrowLeft, Plus, Minus, Undo, History, TrendingUp, Search, Filter } from 'lucide-react';
import PagePasswordGuard from '../components/PagePasswordGuard';

function AttributePage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [operationType, setOperationType] = useState('add'); // 'add' or 'subtract'
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 新增筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamGroup, setSelectedTeamGroup] = useState('');
  const [selectedAttributeType, setSelectedAttributeType] = useState('');
  
  // 加分状态
  const [groupScores, setGroupScores] = useState({}); // 存储小组每个人的分数
  
  // 历史记录状态
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
  const [showUserHistory, setShowUserHistory] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserHistory(selectedUser);
      
      // 检查是否能增加属性，如果不能则自动切换到减少模式
      const userAttribute = getSelectedUserAttribute();
      if (userAttribute && operationType === 'add') {
        const user = users.find(u => u.id === selectedUser);
        if (user && !canIncrementAttribute(user.disciple, userAttribute.key)) {
          setOperationType('subtract');
        }
      }
    } else {
      setUserHistory([]);
    }
  }, [selectedUser, users]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      setMessage({ type: 'error', text: '获取用户列表失败：' + error.message });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserHistory = async (userId) => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('attribute_history')
        .select(`
          *,
          users!inner(name)
        `)
        .eq('user_id', userId)
        .eq('is_undone', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUserHistory(data || []);
    } catch (error) {
      console.error('获取历史记录失败：', error);
      setUserHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const validateForm = () => {
    if (!selectedTeamGroup && !searchTerm && !selectedAttributeType) {
      setMessage({ type: 'error', text: '请选择小组、属性类型或输入搜索关键词' });
      return false;
    }
    
    const groupUsers = getFilteredUsers();
    if (groupUsers.length === 0) {
      setMessage({ type: 'error', text: '没有找到符合条件的用户' });
      return false;
    }
    
    // 检查是否有任何用户有分数
    const hasScores = Object.values(groupScores).some(score => score > 0);
    if (!hasScores) {
      setMessage({ type: 'error', text: '请至少为一位用户设置分数' });
      return false;
    }
    
    // 验证每个有分数的用户
    for (const [userId, score] of Object.entries(groupScores)) {
      if (score > 0) {
        const user = users.find(u => u.id === userId);
        if (!user) continue;
        
        // 获取该用户的属性信息
        const userAttribute = getUserAttribute(user);
        if (!userAttribute) {
          setMessage({ type: 'error', text: `无法获取 ${user.name} 的属性信息，请检查门派配置` });
          return false;
        }
        
        // 检查用户属性限制（仅对增加操作）
        if (operationType === 'add' && !canIncrementAttribute(user.disciple, userAttribute.key)) {
          const groupName = getGroupDisplayName(getDiscipleGroup(user.disciple));
          setMessage({ 
            type: 'error', 
            text: `${user.name} 是${groupName}，无法增加${userAttribute.name}属性` 
          });
          return false;
        }
        
        // 如果是减少操作，检查是否会导致负值
        if (operationType === 'subtract') {
          const currentValue = user[userAttribute.key] || 0;
          const newValue = currentValue - score;
          
          if (newValue < 0) {
            setMessage({ type: 'error', text: `${user.name} 减少后的值不能为负数。当前${userAttribute.name}值为${currentValue}` });
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // 小组模式
      const groupUsers = getFilteredUsers();
      let successCount = 0;
      let errorMessages = [];

      for (const user of groupUsers) {
        const score = groupScores[user.id] || 0;
        if (score > 0) {
          try {
            // 获取该用户的属性信息
            const userAttribute = getUserAttribute(user);
            if (!userAttribute) {
              errorMessages.push(`${user.name}: 无法获取属性信息`);
              continue;
            }
            
            const currentValue = user[userAttribute.key] || 0;
            const newValue = operationType === 'add' 
              ? currentValue + score 
              : currentValue - score;
            
            const updateData = {};
            updateData[userAttribute.key] = newValue;

            const { error: updateError } = await supabase
              .from('users')
              .update(updateData)
              .eq('id', user.id);

            if (updateError) {
              errorMessages.push(`${user.name}: ${updateError.message}`);
            } else {
              successCount++;
            }
          } catch (error) {
            errorMessages.push(`${user.name}: ${error.message}`);
          }
        }
      }

      const operationText = operationType === 'add' ? '增加' : '减少';
      if (successCount > 0) {
        // 获取涉及的属性类型
        const attributeTypes = new Set();
        for (const user of groupUsers) {
          const score = groupScores[user.id] || 0;
          if (score > 0) {
            const userAttribute = getUserAttribute(user);
            if (userAttribute) {
              attributeTypes.add(userAttribute.name);
            }
          }
        }
        
        const attributeText = attributeTypes.size === 1 
          ? Array.from(attributeTypes)[0]
          : `多种属性（${Array.from(attributeTypes).join('、')}）`;
        
        setMessage({ 
          type: 'success', 
          text: `成功为 ${successCount} 位用户${operationText}${attributeText}！` 
        });
      }
      if (errorMessages.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `部分操作失败：${errorMessages.join('; ')}` 
        });
      }
      
      // 重置表单
      setSelectedUser('');
      setAttributeValue('');
      setOperationType('add');
      setGroupScores({});
      
      // 刷新用户列表
      fetchUsers();

    } catch (error) {
      setMessage({ type: 'error', text: '属性修改失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const undoLastOperation = async () => {
    if (userHistory.length === 0) {
      setMessage({ type: 'error', text: '没有可撤销的操作' });
      return;
    }

    if (!window.confirm('确定要撤销最后一次操作吗？')) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const lastOperation = userHistory[0];
      
      // 恢复到旧值
      const updateData = {};
      updateData[lastOperation.attribute_type] = lastOperation.old_value;

      // 更新用户属性
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser);

      if (updateError) throw updateError;

      // 标记历史记录为已撤销
      const { error: historyError } = await supabase
        .from('attribute_history')
        .update({ is_undone: true })
        .eq('id', lastOperation.id);

      if (historyError) throw historyError;

      // 记录撤销操作
      const { error: recordError } = await supabase
        .from('attribute_history')
        .insert({
          user_id: selectedUser,
          attribute_type: lastOperation.attribute_type,
          operation_type: 'undo',
          value_change: lastOperation.value_change,
          old_value: lastOperation.new_value,
          new_value: lastOperation.old_value
        });

      if (recordError) throw recordError;

      const user = users.find(u => u.id === selectedUser);
      const attributeName = ATTRIBUTES[lastOperation.attribute_type.toUpperCase()];
      setMessage({ 
        type: 'success', 
        text: `成功撤销 ${user.name} 的${attributeName}操作，当前值：${lastOperation.old_value}` 
      });

      // 刷新数据
      fetchUsers();
      fetchUserHistory(selectedUser);

    } catch (error) {
      setMessage({ type: 'error', text: '撤销操作失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setAttributeValue('');
    setOperationType('add');
    setMessage({ type: '', text: '' });
    setShowHistory(false);
    setSearchTerm('');
    setSelectedTeamGroup('');
    setSelectedAttributeType('');
    setGroupScores({});
  };

  // 获取用户的主属性
  const getSelectedUserAttribute = () => {
    // 在小组模式下，从筛选出的用户中获取属性信息
    const filteredUsers = getFilteredUsers();
    if (filteredUsers.length === 0) return null;
    
    // 检查所有用户是否有相同的门派（属性类型）
    const disciples = [...new Set(filteredUsers.map(user => user.disciple))];
    if (disciples.length > 1) {
      // 如果用户门派不同，返回null，让用户手动选择
      return null;
    }
    
    const firstUser = filteredUsers[0];
    const discipleConfig = DISCIPLE_CONFIG[firstUser.disciple];
    if (!discipleConfig) return null;
    
    const attributeKey = discipleConfig.primaryAttribute;
    const attributeName = ATTRIBUTES[attributeKey.toUpperCase()];
    
    return {
      key: attributeKey,
      name: attributeName
    };
  };

  // 获取用户的主属性（支持多门派）
  const getUserAttribute = (user) => {
    const discipleConfig = DISCIPLE_CONFIG[user.disciple];
    if (!discipleConfig) return null;
    
    const attributeKey = discipleConfig.primaryAttribute;
    const attributeName = ATTRIBUTES[attributeKey.toUpperCase()];
    
    return {
      key: attributeKey,
      name: attributeName
    };
  };

  // 获取筛选后的用户列表
  const getFilteredUsers = () => {
    let filtered = users;
    
    // 按组别筛选
    if (selectedTeamGroup) {
      filtered = filtered.filter(user => 
        user.team_group === parseInt(selectedTeamGroup)
      );
    }
    
    // 按搜索词筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.disciple.toLowerCase().includes(term)
      );
    }
    
    // 按属性类型筛选
    if (selectedAttributeType) {
      filtered = filtered.filter(user => {
        const discipleConfig = DISCIPLE_CONFIG[user.disciple];
        if (!discipleConfig) return false;
        return discipleConfig.primaryAttribute === selectedAttributeType;
      });
    }
    
    return filtered;
  };

  const getSelectedUserInfo = () => {
    if (!selectedUser) return null;
    return users.find(user => user.id === selectedUser);
  };

  const selectedUserInfo = getSelectedUserInfo();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOperationIcon = (operation) => {
    switch (operation) {
      case 'add': return <Plus size={14} className="text-green-600" />;
      case 'subtract': return <Minus size={14} className="text-red-600" />;
      case 'undo': return <Undo size={14} className="text-blue-600" />;
      default: return null;
    }
  };

  // 小组模式相关函数
  const initializeGroupScores = (defaultScore) => {
    const groupUsers = getFilteredUsers();
    const newScores = {};
    groupUsers.forEach(user => {
      newScores[user.id] = defaultScore || 0;
    });
    setGroupScores(newScores);
  };

  const updateGroupScore = (userId, score) => {
    setGroupScores(prev => ({
      ...prev,
      [userId]: parseInt(score) || 0
    }));
  };

  const incrementGroupScore = (userId) => {
    setGroupScores(prev => ({
      ...prev,
      [userId]: (prev[userId] || 0) + 1
    }));
  };

  const decrementGroupScore = (userId) => {
    setGroupScores(prev => ({
      ...prev,
      [userId]: Math.max(0, (prev[userId] || 0) - 1)
    }));
  };

  const clearGroupScore = (userId) => {
    setGroupScores(prev => {
      const newScores = { ...prev };
      delete newScores[userId];
      return newScores;
    });
  };

  const clearAllGroupScores = () => {
    setGroupScores({});
  };

  // 查看用户历史记录
  const viewUserHistory = async (user) => {
    setSelectedUserForHistory(user);
    setShowUserHistory(true);
    await fetchUserHistory(user.id);
  };

  // 删除历史记录
  const deleteHistoryRecord = async (recordId) => {
    // 首先获取要删除的记录信息，用于显示确认信息
    const { data: recordData, error: fetchError } = await supabase
      .from('attribute_history')
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError || !recordData) {
      setMessage({ type: 'error', text: '无法获取记录信息' });
      return;
    }

    const user = users.find(u => u.id === recordData.user_id);
    const attributeName = ATTRIBUTES[recordData.attribute_type.toUpperCase()];
    const operationText = recordData.operation_type === 'add' ? '增加' : 
                         recordData.operation_type === 'subtract' ? '减少' : 
                         recordData.operation_type === 'undo' ? '撤销' : '操作';
    
    const confirmMessage = `确定要删除这条${operationText}记录吗？\n\n` +
                          `用户：${user?.name || '未知'}\n` +
                          `属性：${attributeName}\n` +
                          `操作：${recordData.old_value} → ${recordData.new_value}\n\n` +
                          `删除后用户的${attributeName}将恢复到 ${recordData.operation_type === 'undo' ? recordData.new_value : recordData.old_value}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);

      // 根据操作类型决定如何恢复用户属性
      let targetValue;
      let operationDescription;
      
      if (recordData.operation_type === 'undo') {
        // 如果删除的是撤销操作记录，需要恢复到撤销前的状态
        targetValue = recordData.new_value; // 撤销操作的新值就是撤销前的值
        operationDescription = '撤销操作';
      } else {
        // 如果删除的是普通操作记录，恢复到操作前的状态
        targetValue = recordData.old_value;
        operationDescription = recordData.operation_type === 'add' ? '增加操作' : 
                             recordData.operation_type === 'subtract' ? '减少操作' : '操作';
      }

      // 恢复用户的属性值
      const updateData = {};
      updateData[recordData.attribute_type] = targetValue;

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', recordData.user_id);

      if (updateError) throw updateError;

      // 删除历史记录
      const { error: deleteError } = await supabase
        .from('attribute_history')
        .delete()
        .eq('id', recordId);

      if (deleteError) throw deleteError;

      // 获取用户信息用于显示消息
      const user = users.find(u => u.id === recordData.user_id);
      const attributeName = ATTRIBUTES[recordData.attribute_type.toUpperCase()];
      
      setMessage({ 
        type: 'success', 
        text: `成功删除${operationDescription}记录并恢复 ${user?.name || '用户'} 的${attributeName}为 ${targetValue}` 
      });
      
      // 刷新历史记录
      if (selectedUserForHistory) {
        await fetchUserHistory(selectedUserForHistory.id);
      }
      
      // 刷新用户列表
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: '删除记录失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };



  return (
    <PagePasswordGuard pageKey="attribute" pagePassword="AttR1bute">
      <div className="page-container">
        <div className="navigation">
          <Link to="/" className="nav-button">
            <ArrowLeft size={20} />
            返回首页
          </Link>
        </div>

        <div className="page-content" style={{ maxWidth: '1300px'}}>
          <div className="header">
            <h1>
              <TrendingUp size={32} />
              属性管理
            </h1>
            <p>为用户修改属性点数（支持撤销操作）</p>
          </div>

          <div className="card">
            {message.text && (
              <div className={`${message.type === 'error' ? 'error-message' : 'success-message'}`}>
                {message.text}
              </div>
            )}

            {loadingUsers ? (
              <div className="text-center">
                <div className="loading">
                  <div className="spinner"></div>
                  正在加载用户列表...
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center" style={{ padding: '2rem' }}>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  暂无已登记的用户
                </p>
                <Link to="/register" className="btn btn-primary">
                  前往用户登记
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* 筛选区域 */}
                <div className="filter-section" style={{
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <Filter size={16} style={{ marginRight: '8px', color: '#667eea' }} />
                    <h3 style={{ margin: 0, fontSize: '16px' }}>筛选设置</h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    {/* 小组选择 */}
                    <div className="form-group">
                      <label className="form-label">选择小组</label>
                      <select
                        value={selectedTeamGroup}
                        onChange={(e) => setSelectedTeamGroup(e.target.value)}
                        className="form-select"
                        disabled={loading}
                      >
                        <option value="">请选择小组</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((group) => (
                          <option key={group} value={group}>
                            第{group}组
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 属性类型选择 */}
                    <div className="form-group">
                      <label className="form-label">属性类型</label>
                      <select
                        value={selectedAttributeType}
                        onChange={(e) => setSelectedAttributeType(e.target.value)}
                        className="form-select"
                        disabled={loading}
                      >
                        <option value="">所有属性</option>
                        <option value="courage">勇气</option>
                        <option value="faith">信心</option>
                        <option value="wisdom">智力</option>
                      </select>
                    </div>
                    
                    {/* 搜索框 */}
                    <div className="form-group">
                      <label className="form-label">搜索用户</label>
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#666'
                        }} />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="输入姓名或门派搜索..."
                          className="form-input"
                          style={{ paddingLeft: '40px' }}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 筛选结果统计 */}
                  {(selectedTeamGroup || searchTerm) && (
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef'
                    }}>
                      {(() => {
                        const filteredCount = getFilteredUsers().length;
                        const totalCount = users.length;
                        let filterText = [];
                        
                        if (selectedTeamGroup) {
                          filterText.push(`第${selectedTeamGroup}组`);
                        }
                        if (searchTerm) {
                          filterText.push(`搜索"${searchTerm}"`);
                        }
                        
                        const disciples = [...new Set(getFilteredUsers().map(user => user.disciple))];
                        const multiDiscipleText = disciples.length > 1 
                          ? ` · 包含${disciples.length}个门派（${disciples.join('、')}）`
                          : '';
                        
                        const attributeText = selectedAttributeType 
                          ? ` · ${ATTRIBUTES[selectedAttributeType.toUpperCase()]}用户`
                          : '';
                        
                        return `找到 ${filteredCount} 位用户${filterText.length > 0 ? ` (${filterText.join(' + ')})` : ''}${multiDiscipleText}${attributeText} · 共${totalCount}位用户`;
                      })()}
                    </div>
                  )}
                </div>


                  <div className="form-group">
                    <label className="form-label">
                      用户列表
                    </label>
                    {(selectedTeamGroup || searchTerm || selectedAttributeType) ? (
                      <div style={{ 
                        background: '#f8f9fa', 
                        padding: '16px', 
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <h4 style={{ margin: 0 }}>
                            {(() => {
                              let title = '';
                              if (selectedTeamGroup && searchTerm) {
                                title = `第${selectedTeamGroup}组 + 搜索"${searchTerm}"`;
                              } else if (selectedTeamGroup) {
                                title = `第${selectedTeamGroup}组`;
                              } else if (searchTerm) {
                                title = `搜索"${searchTerm}"`;
                              }
                              
                              const disciples = [...new Set(getFilteredUsers().map(user => user.disciple))];
                              const multiDiscipleText = disciples.length > 1 
                                ? ` · ${disciples.length}门派`
                                : '';
                              
                              const attributeText = selectedAttributeType 
                                ? ` · ${ATTRIBUTES[selectedAttributeType.toUpperCase()]}`
                                : '';
                              
                              return `${title} (${getFilteredUsers().length}人)${multiDiscipleText}${attributeText}`;
                            })()}
                          </h4>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const defaultScore = prompt('请输入默认分数：', '5');
                                if (defaultScore && !isNaN(defaultScore)) {
                                  initializeGroupScores(parseInt(defaultScore));
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              disabled={loading}
                            >
                              一键初始化
                            </button>
                            <button
                              type="button"
                              onClick={clearAllGroupScores}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              disabled={loading}
                            >
                              清空所有
                            </button>
                          </div>
                        </div>
                        
                        {getFilteredUsers().length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                            {selectedTeamGroup && searchTerm 
                              ? `第${selectedTeamGroup}组中没有找到包含"${searchTerm}"的用户`
                              : selectedTeamGroup 
                                ? '该小组暂无用户'
                                : `没有找到包含"${searchTerm}"的用户`
                            }
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr', 
                            gap: '10px' 
                          }}>
                            {getFilteredUsers().map((user) => (
                              <div key={user.id} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '10px',
                                border: '1px solid #e9ecef',
                                borderRadius: '6px',
                                background: 'white',
                                minHeight: '110px'
                              }}>
                                <div style={{ flex: 1, marginBottom: '10px' }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    fontSize: '13px'
                                  }}>
                                    <span style={{ fontWeight: 'bold' }}>
                                      {user.name}
                                    </span>
                                    <span style={{ color: '#666', fontSize: '10px' }}>
                                      {user.disciple}
                                    </span>
                                    <span style={{ 
                                      color: '#667eea', 
                                      fontSize: '10px', 
                                      fontWeight: 'bold',
                                      marginLeft: '4px'
                                    }}>
                                      第{user.team_group}组
                                    </span>
                                    <span style={{ marginLeft: 'auto' }}></span>
                                    <span style={{ 
                                      fontSize: '12px', 
                                      fontWeight: 'bold'
                                    }}>
                                      {(() => {
                                        const userAttribute = getUserAttribute(user);
                                        if (!userAttribute) return '';
                                        const attributeValue = user[userAttribute.key] || 0;
                                        const attributeColor = getGroupColor(getDiscipleGroup(user.disciple));
                                        return (
                                          <span style={{ 
                                            color: attributeColor,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: `${attributeColor}15`,
                                            border: `1px solid ${attributeColor}30`
                                          }}>
                                            {userAttribute.name}: {attributeValue}
                                          </span>
                                        );
                                      })()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => decrementGroupScore(user.id)}
                                    className="btn btn-secondary"
                                    style={{ 
                                      padding: '6px 8px', 
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      minWidth: '32px',
                                      height: '28px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    disabled={loading}
                                  >
                                    -
                                  </button>
                                  
                                  <input
                                    type="text"
                                    value={groupScores[user.id] || 0}
                                    onChange={(e) => {
                                      // 只允许数字输入
                                      const value = e.target.value.replace(/[^0-9]/g, '');
                                      const numValue = parseInt(value) || 0;
                                      updateGroupScore(user.id, numValue);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={(e) => {
                                      // 确保值为自然数
                                      const value = parseInt(e.target.value) || 0;
                                      if (value < 0) {
                                        updateGroupScore(user.id, 0);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      // 阻止上下箭头键的默认行为
                                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                        e.preventDefault();
                                      }
                                    }}
                                    style={{
                                      width: '60px',
                                      padding: '6px 8px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '13px',
                                      fontWeight: 'bold',
                                      textAlign: 'center',
                                      background: 'white',
                                      minHeight: '32px'
                                    }}
                                    disabled={loading}
                                  />
                                  
                                  <button
                                    type="button"
                                    onClick={() => incrementGroupScore(user.id)}
                                    className="btn btn-primary"
                                    style={{ 
                                      padding: '6px 8px', 
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      minWidth: '32px',
                                      height: '28px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    disabled={loading}
                                  >
                                    +
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => clearGroupScore(user.id)}
                                    className="btn btn-secondary"
                                    style={{ 
                                      padding: '4px 6px', 
                                      fontSize: '10px',
                                      marginLeft: '4px'
                                    }}
                                    disabled={loading}
                                  >
                                    清空
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => viewUserHistory(user)}
                                    className="btn btn-secondary"
                                    style={{ 
                                      padding: '4px 6px', 
                                      fontSize: '10px',
                                      marginLeft: '4px'
                                    }}
                                    disabled={loading}
                                  >
                                    历史
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '6px',
                        color: '#666',
                        fontSize: '14px',
                        border: '1px solid #e9ecef'
                      }}>
                        请先选择小组、属性类型或输入搜索关键词
                      </div>
                    )}
                  </div>




                  <div className="form-group">
                    <label className="form-label">
                      操作类型 *
                    </label>
                    <div className="grid grid-2">
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px', 
                        border: operationType === 'add' ? '2px solid #667eea' : '2px solid #e9ecef', 
                        borderRadius: '8px', 
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="operationType"
                          value="add"
                          checked={operationType === 'add'}
                          onChange={(e) => setOperationType(e.target.value)}
                          disabled={loading}
                          style={{ marginRight: '8px' }}
                        />
                        <Plus size={16} style={{ marginRight: '4px', color: '#28a745' }} />
                        增加属性
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px', 
                        border: operationType === 'subtract' ? '2px solid #667eea' : '2px solid #e9ecef', 
                        borderRadius: '8px', 
                        cursor: 'pointer' 
                      }}>
                        <input
                          type="radio"
                          name="operationType"
                          value="subtract"
                          checked={operationType === 'subtract'}
                          onChange={(e) => setOperationType(e.target.value)}
                          disabled={loading}
                          style={{ marginRight: '8px' }}
                        />
                        <Minus size={16} style={{ marginRight: '4px', color: '#dc3545' }} />
                        减少属性
                      </label>
                    </div>
                  </div>

                <div className="grid grid-2 mt-4">
                  <button
                    type="submit"
                    className={`btn ${operationType === 'add' ? 'btn-primary' : 'btn-danger'}`}
                    disabled={loading || (!selectedTeamGroup && !searchTerm && !selectedAttributeType) || Object.values(groupScores).every(score => score <= 0)}
                  >
                    {loading ? (
                      <div className="loading">
                        <div className="spinner"></div>
                        {operationType === 'add' ? '增加中...' : '减少中...'}
                      </div>
                    ) : (
                      <>
                        {operationType === 'add' ? <Plus size={20} /> : <Minus size={20} />}
                        {operationType === 'add' ? '批量增加' : '批量减少'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    重置表单
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 用户历史记录模态框 */}
      {showUserHistory && selectedUserForHistory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0 }}>
                {selectedUserForHistory.name} 的属性历史记录
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowUserHistory(false);
                  setSelectedUserForHistory(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {loadingHistory ? (
              <div className="loading">
                <div className="spinner"></div>
                加载中...
              </div>
            ) : userHistory.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px', textAlign: 'center' }}>
                暂无操作历史
              </p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {userHistory.map((record, index) => (
                  <div key={record.id} style={{ 
                    padding: '12px', 
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    background: '#f8f9fa'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '14px'
                      }}>
                        {getOperationIcon(record.operation_type)}
                        <span style={{ fontWeight: 'bold' }}>
                          {ATTRIBUTES[record.attribute_type.toUpperCase()]} 
                          {record.operation_type === 'add' ? '+' : record.operation_type === 'subtract' ? '-' : 'undo' ? '撤销' : ''}
                          {record.value_change}
                        </span>
                        <span style={{ color: '#666' }}>
                          ({record.old_value} → {record.new_value})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteHistoryRecord(record.id)}
                        className="btn btn-danger"
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: '12px'
                        }}
                        disabled={loading}
                      >
                        删除
                      </button>
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{formatDate(record.created_at)}</span>
                      <span>ID: {record.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PagePasswordGuard>
  );
}

export default AttributePage; 