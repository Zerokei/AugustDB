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
  const [selectedGroup, setSelectedGroup] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamGroup, setSelectedTeamGroup] = useState('');

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
    if (!selectedUser) {
      setMessage({ type: 'error', text: '请选择一位用户' });
      return false;
    }
    
    const userAttribute = getSelectedUserAttribute();
    if (!userAttribute) {
      setMessage({ type: 'error', text: '无法获取用户属性信息' });
      return false;
    }
    
    if (!attributeValue || isNaN(attributeValue) || attributeValue <= 0) {
      setMessage({ type: 'error', text: '请输入有效的属性值（大于0的数字）' });
      return false;
    }

    // 检查用户属性限制（仅对增加操作）
    if (operationType === 'add') {
      const user = users.find(u => u.id === selectedUser);
      if (user && !canIncrementAttribute(user.disciple, userAttribute.key)) {
        const groupName = getGroupDisplayName(getDiscipleGroup(user.disciple));
        setMessage({ 
          type: 'error', 
          text: `${user.name} 是${groupName}，无法增加${userAttribute.name}属性` 
        });
        return false;
      }
    }

    // 如果是减少操作，检查是否会导致负值
    if (operationType === 'subtract') {
      const user = users.find(u => u.id === selectedUser);
      const currentValue = user[userAttribute.key] || 0;
      const newValue = currentValue - parseInt(attributeValue);
      
      if (newValue < 0) {
        setMessage({ type: 'error', text: `减少后的值不能为负数。当前${userAttribute.name}值为${currentValue}` });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const userAttribute = getSelectedUserAttribute();
    if (!userAttribute) {
      setMessage({ type: 'error', text: '无法获取用户属性信息' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // 获取当前用户信息
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', selectedUser)
        .single();

      if (fetchError) throw fetchError;

      // 准备更新数据
      const updateData = {};
      const attributeKey = userAttribute.key;
      const currentValue = currentUser[attributeKey] || 0;
      const changeValue = parseInt(attributeValue);
      const newValue = operationType === 'add' 
        ? currentValue + changeValue 
        : currentValue - changeValue;
      
      updateData[attributeKey] = newValue;

      // 更新用户属性
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser);

      if (updateError) throw updateError;

      const operationText = operationType === 'add' ? '增加' : '减少';
      setMessage({ 
        type: 'success', 
        text: `成功为 ${currentUser.name} ${operationText} ${attributeValue} 点${userAttribute.name}！当前${userAttribute.name}：${newValue}` 
      });
      
      // 重置表单
      setSelectedUser('');
      setAttributeValue('');
      setOperationType('add');
      
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
    setSelectedGroup('');
    setSearchTerm('');
    setSelectedTeamGroup('');
  };

  // 获取选中用户的主属性
  const getSelectedUserAttribute = () => {
    if (!selectedUser) return null;
    const user = users.find(u => u.id === selectedUser);
    if (!user) return null;
    
    const discipleConfig = DISCIPLE_CONFIG[user.disciple];
    if (!discipleConfig) return null;
    
    return {
      key: discipleConfig.primaryAttribute,
      name: ATTRIBUTES[discipleConfig.primaryAttribute.toUpperCase()]
    };
  };

  // 获取筛选后的用户列表
  const getFilteredUsers = () => {
    let filtered = users;
    
    // 按分组筛选
    if (selectedGroup) {
      filtered = filtered.filter(user => 
        getDiscipleGroup(user.disciple) === selectedGroup
      );
    }
    
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

  return (
    <PagePasswordGuard pageKey="attribute" pagePassword="AttR1bute">
      <div className="page-container">
        <div className="navigation">
          <Link to="/" className="nav-button">
            <ArrowLeft size={20} />
            返回首页
          </Link>
        </div>

        <div className="page-content">
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
                {/* 用户筛选区域 */}
                <div className="filter-section" style={{
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <Filter size={16} style={{ marginRight: '8px', color: '#667eea' }} />
                    <h3 style={{ margin: 0, fontSize: '16px' }}>用户筛选</h3>
                  </div>
                  
                  <div className="grid grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">按分组筛选</label>
                      <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="form-select"
                        disabled={loading}
                      >
                        <option value="">全部分组</option>
                        <option value={DISCIPLE_GROUPS.WISDOM}>智力用户组</option>
                        <option value={DISCIPLE_GROUPS.COURAGE}>勇气用户组</option>
                        <option value={DISCIPLE_GROUPS.FAITH}>信心用户组</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">按组别筛选</label>
                      <select
                        value={selectedTeamGroup}
                        onChange={(e) => setSelectedTeamGroup(e.target.value)}
                        className="form-select"
                        disabled={loading}
                      >
                        <option value="">全部组别</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((group) => (
                          <option key={group} value={group}>
                            第{group}组
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
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
                        className="form-input"
                        placeholder="输入姓名或使徒名"
                        style={{ paddingLeft: '40px' }}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  {(selectedGroup || searchTerm || selectedTeamGroup) && (
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      找到 {getFilteredUsers().length} 位用户
                      {selectedGroup && ` · ${getGroupDisplayName(selectedGroup)}`}
                      {selectedTeamGroup && ` · 第${selectedTeamGroup}组`}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="user">
                    选择用户 *
                  </label>
                  <select
                    id="user"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="form-select"
                    disabled={loading}
                    required
                  >
                    <option value="">请选择一位用户</option>
                    {getFilteredUsers().map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.disciple} ({user.gender}) - 第{user.team_group}组
                      </option>
                    ))}
                  </select>
                  {getFilteredUsers().length === 0 && (selectedGroup || searchTerm || selectedTeamGroup) && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      没有找到匹配的用户，请调整筛选条件
                    </div>
                  )}
                </div>

                {selectedUserInfo && (
                  <div className="user-card mb-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3>{selectedUserInfo.name}</h3>
                        <div className="user-info">
                          <p><strong>使徒：</strong>{selectedUserInfo.disciple}</p>
                          <p><strong>性别：</strong>{selectedUserInfo.gender}</p>
                          <p><strong>组别：</strong>第{selectedUserInfo.team_group}组</p>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginTop: '8px'
                          }}>
                            <div style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: getGroupColor(getDiscipleGroup(selectedUserInfo.disciple))
                            }}></div>
                            <span style={{ 
                              fontSize: '14px',
                              fontWeight: 'bold',
                              color: getGroupColor(getDiscipleGroup(selectedUserInfo.disciple))
                            }}>
                              {getGroupDisplayName(getDiscipleGroup(selectedUserInfo.disciple))}
                            </span>
                          </div>
                          {/* 显示主属性信息 */}
                          {getSelectedUserAttribute() && (
                            <div style={{ 
                              marginTop: '12px',
                              padding: '8px 12px',
                              background: '#e8f4fd',
                              borderRadius: '6px',
                              border: '1px solid #bee5eb'
                            }}>
                              <span style={{ fontSize: '14px', color: '#0c5460' }}>
                                <strong>可操作属性：</strong>{getSelectedUserAttribute().name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowHistory(!showHistory)}
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px' }}
                          disabled={loading}
                        >
                          <History size={16} />
                          {showHistory ? '隐藏历史' : '查看历史'}
                        </button>
                        {userHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={undoLastOperation}
                            className="btn btn-secondary"
                            style={{ padding: '8px 12px' }}
                            disabled={loading}
                          >
                            <Undo size={16} />
                            撤销上次
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="attributes">
                      <div className="attribute-item">
                        <div className="attribute-value">{selectedUserInfo.courage || 0}</div>
                        <div className="attribute-name">勇气</div>
                      </div>
                      <div className="attribute-item">
                        <div className="attribute-value">{selectedUserInfo.faith || 0}</div>
                        <div className="attribute-name">信心</div>
                      </div>
                      <div className="attribute-item">
                        <div className="attribute-value">{selectedUserInfo.wisdom || 0}</div>
                        <div className="attribute-name">智力</div>
                      </div>
                    </div>

                    {showHistory && (
                      <div style={{ marginTop: '1rem' }}>
                        <h4>操作历史</h4>
                        {loadingHistory ? (
                          <div className="loading">
                            <div className="spinner"></div>
                            加载中...
                          </div>
                        ) : userHistory.length === 0 ? (
                          <p style={{ color: '#666', fontSize: '14px' }}>暂无操作历史</p>
                        ) : (
                          <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
                            {userHistory.map((record, index) => (
                              <div key={record.id} style={{ 
                                padding: '8px 0', 
                                borderBottom: index < userHistory.length - 1 ? '1px solid #e9ecef' : 'none',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                {getOperationIcon(record.operation_type)}
                                <span>
                                  {ATTRIBUTES[record.attribute_type.toUpperCase()]} 
                                  {record.operation_type === 'add' ? '+' : record.operation_type === 'subtract' ? '-' : '撤销'}
                                  {record.value_change} 
                                  ({record.old_value} → {record.new_value})
                                </span>
                                <span style={{ color: '#666', marginLeft: 'auto' }}>
                                  {formatDate(record.created_at)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    操作类型 *
                  </label>
                  {!selectedUser ? (
                    <div style={{ 
                      padding: '12px', 
                      background: '#f8f9fa', 
                      borderRadius: '6px',
                      color: '#666',
                      fontSize: '14px',
                      border: '1px solid #e9ecef'
                    }}>
                      请先选择用户
                    </div>
                  ) : (
                    <div className="grid grid-2">
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px', 
                        border: operationType === 'add' ? '2px solid #667eea' : '2px solid #e9ecef', 
                        borderRadius: '8px', 
                        cursor: getSelectedUserAttribute() && canIncrementAttribute(selectedUserInfo?.disciple, getSelectedUserAttribute().key) ? 'pointer' : 'not-allowed',
                        opacity: getSelectedUserAttribute() && canIncrementAttribute(selectedUserInfo?.disciple, getSelectedUserAttribute().key) ? 1 : 0.5
                      }}>
                        <input
                          type="radio"
                          name="operationType"
                          value="add"
                          checked={operationType === 'add'}
                          onChange={(e) => setOperationType(e.target.value)}
                          disabled={loading || !getSelectedUserAttribute() || !canIncrementAttribute(selectedUserInfo?.disciple, getSelectedUserAttribute()?.key)}
                          style={{ marginRight: '8px' }}
                        />
                        <Plus size={16} style={{ marginRight: '4px', color: '#28a745' }} />
                        增加属性
                        {getSelectedUserAttribute() && !canIncrementAttribute(selectedUserInfo?.disciple, getSelectedUserAttribute().key) && (
                          <span style={{ fontSize: '12px', color: '#dc3545', marginLeft: '8px' }}>
                            (不可增加)
                          </span>
                        )}
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
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="value">
                    {operationType === 'add' ? '增加' : '减少'}数值 *
                    {getSelectedUserAttribute() && (
                      <span style={{ color: '#667eea', fontWeight: 'normal' }}>
                        （{getSelectedUserAttribute().name}）
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    id="value"
                    value={attributeValue}
                    onChange={(e) => setAttributeValue(e.target.value)}
                    className="form-input"
                    placeholder={`请输入要${operationType === 'add' ? '增加' : '减少'}的属性点数`}
                    min="1"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid grid-2 mt-4">
                  <button
                    type="submit"
                    className={`btn ${operationType === 'add' ? 'btn-primary' : 'btn-danger'}`}
                    disabled={loading || !selectedUser || !attributeValue || !getSelectedUserAttribute()}
                  >
                    {loading ? (
                      <div className="loading">
                        <div className="spinner"></div>
                        {operationType === 'add' ? '增加中...' : '减少中...'}
                      </div>
                    ) : (
                      <>
                        {operationType === 'add' ? <Plus size={20} /> : <Minus size={20} />}
                        {operationType === 'add' ? '增加属性' : '减少属性'}
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
    </PagePasswordGuard>
  );
}

export default AttributePage; 