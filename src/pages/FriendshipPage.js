import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getDiscipleGroup, getGroupDisplayName, getGroupColor, DISCIPLE_GROUPS } from '../lib/discipleConfig';
import { ArrowLeft, Users, Plus, Trash2, Search, UserPlus2, BarChart3, Filter } from 'lucide-react';
import PagePasswordGuard from '../components/PagePasswordGuard';

function FriendshipPage() {
  const [users, setUsers] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingFriendship, setAddingFriendship] = useState(false);
  const [deletingFriendship, setDeletingFriendship] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState(null);

  // 添加朋友表单状态
  const [formData, setFormData] = useState({
    user1: '',
    user2: '',
    notes: ''
  });

  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');
  
  // 新增筛选状态
  const [selectedGroup1, setSelectedGroup1] = useState('');
  const [selectedGroup2, setSelectedGroup2] = useState('');
  const [userSearchTerm1, setUserSearchTerm1] = useState('');
  const [userSearchTerm2, setUserSearchTerm2] = useState('');
  const [selectedTeamGroup1, setSelectedTeamGroup1] = useState('');
  const [selectedTeamGroup2, setSelectedTeamGroup2] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchFriendships(),
        fetchStats()
      ]);
    } catch (error) {
      setMessage({ type: 'error', text: '获取数据失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setUsers(data || []);
  };

  const fetchFriendships = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user1:users!friendships_user1_id_fkey(id, name, disciple, gender, team_group),
        user2:users!friendships_user2_id_fkey(id, name, disciple, gender, team_group)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setFriendships(data || []);
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_friendship_stats');
      
      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('获取统计数据失败：', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.user1) {
      setMessage({ type: 'error', text: '请选择第一个用户' });
      return false;
    }
    if (!formData.user2) {
      setMessage({ type: 'error', text: '请选择第二个用户' });
      return false;
    }
    if (formData.user1 === formData.user2) {
      setMessage({ type: 'error', text: '不能选择同一个用户' });
      return false;
    }
    
    // 检查是否已存在相同方向的朋友关系
    const sameDirectionExists = friendships.some(f => 
      f.user1_id === formData.user1 && f.user2_id === formData.user2
    );
    
    if (sameDirectionExists) {
      const user1Name = users.find(u => u.id === formData.user1)?.name;
      const user2Name = users.find(u => u.id === formData.user2)?.name;
      setMessage({ type: 'error', text: `${user1Name} 已经认识了 ${user2Name}` });
      return false;
    }

    // 检查是否已存在反向的朋友关系
    const reverseDirectionExists = friendships.some(f => 
      f.user1_id === formData.user2 && f.user2_id === formData.user1
    );
    
    if (reverseDirectionExists) {
      const user1Name = users.find(u => u.id === formData.user1)?.name;
      const user2Name = users.find(u => u.id === formData.user2)?.name;
      setMessage({ type: 'error', text: `${user2Name} 已经认识了 ${user1Name}，不能建立反向关系` });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setAddingFriendship(true);
      setMessage({ type: '', text: '' });

      const { error } = await supabase
        .rpc('add_friendship', {
          user1_uuid: formData.user1,
          user2_uuid: formData.user2,
          friendship_notes: formData.notes.trim() || null
        });

      if (error) throw error;

      const user1Name = users.find(u => u.id === formData.user1)?.name;
      const user2Name = users.find(u => u.id === formData.user2)?.name;
      
      setMessage({ 
        type: 'success', 
        text: `成功记录 ${user1Name} 认识了 ${user2Name}！${user1Name} 获得朋友数 +1` 
      });
      
      // 重置表单
      setFormData({
        user1: '',
        user2: '',
        notes: ''
      });
      
      // 刷新数据
      fetchData();

    } catch (error) {
      setMessage({ type: 'error', text: '建立认识关系失败：' + error.message });
    } finally {
      setAddingFriendship(false);
    }
  };

  const deleteFriendship = async (friendshipId) => {
    const friendship = friendships.find(f => f.id === friendshipId);
    if (!friendship) return;

    if (!window.confirm(`确定要删除 ${friendship.user1.name} 认识 ${friendship.user2.name} 的记录吗？`)) {
      return;
    }

    try {
      setDeletingFriendship(friendshipId);
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      
      setMessage({ type: 'success', text: '认识关系记录已删除' });
      fetchData();

    } catch (error) {
      setMessage({ type: 'error', text: '删除认识关系失败：' + error.message });
    } finally {
      setDeletingFriendship(null);
    }
  };

  const resetForm = () => {
    setFormData({
      user1: '',
      user2: '',
      notes: ''
    });
    setMessage({ type: '', text: '' });
    setSelectedGroup1('');
    setSelectedGroup2('');
    setUserSearchTerm1('');
    setUserSearchTerm2('');
    setSelectedTeamGroup1('');
    setSelectedTeamGroup2('');
  };

  // 获取筛选后的用户列表 - 用于第一个选择框
  const getFilteredUsers1 = () => {
    let filtered = users;
    
    if (selectedGroup1) {
      filtered = filtered.filter(user => 
        getDiscipleGroup(user.disciple) === selectedGroup1
      );
    }
    
    if (selectedTeamGroup1) {
      filtered = filtered.filter(user => 
        user.team_group === parseInt(selectedTeamGroup1)
      );
    }
    
    if (userSearchTerm1) {
      const term = userSearchTerm1.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.disciple.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // 获取筛选后的用户列表 - 用于第二个选择框
  const getFilteredUsers2 = () => {
    let filtered = users.filter(user => user.id !== formData.user1);
    
    if (selectedGroup2) {
      filtered = filtered.filter(user => 
        getDiscipleGroup(user.disciple) === selectedGroup2
      );
    }
    
    if (selectedTeamGroup2) {
      filtered = filtered.filter(user => 
        user.team_group === parseInt(selectedTeamGroup2)
      );
    }
    
    if (userSearchTerm2) {
      const term = userSearchTerm2.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.disciple.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // 过滤朋友关系
  const filteredFriendships = friendships.filter(friendship => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return friendship.user1.name.toLowerCase().includes(term) ||
           friendship.user2.name.toLowerCase().includes(term) ||
           friendship.user1.disciple.toLowerCase().includes(term) ||
           friendship.user2.disciple.toLowerCase().includes(term);
  });

  return (
    <PagePasswordGuard pageKey="friend" pagePassword="Fr1eUd">
      <div className="page-container">
        <div className="navigation">
          <Link to="/" className="nav-button">
            <ArrowLeft size={20} />
            返回首页
          </Link>
        </div>

        <div className="page-content" style={{ maxWidth: '1000px' }}>
          <div className="header">
            <h1>
              <UserPlus2 size={32} />
              朋友结交
            </h1>
            <p>记录用户之间的单向且唯一认识关系，避免重复加分</p>
          </div>

          <div className="card">
            {message.text && (
              <div className={`${message.type === 'error' ? 'error-message' : 'success-message'}`}>
                {message.text}
              </div>
            )}

            {loading ? (
              <div className="text-center">
                <div className="loading">
                  <div className="spinner"></div>
                  正在加载...
                </div>
              </div>
            ) : users.length < 2 ? (
              <div className="text-center" style={{ padding: '2rem' }}>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  至少需要2个用户才能建立认识关系
                </p>
                <Link to="/register" className="btn btn-primary">
                  前往用户登记
                </Link>
              </div>
            ) : (
              <>
                {/* 添加朋友关系表单 */}
                <form onSubmit={handleSubmit} className="mb-4">
                  <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    建立新的认识关系
                  </h3>
                  <div style={{ 
                    background: '#f0f7ff', 
                    padding: '12px', 
                    borderRadius: '6px', 
                    marginBottom: '16px',
                    border: '1px solid #d1ecf1',
                    fontSize: '14px',
                    color: '#0c5460'
                  }}>
                    💡 <strong>说明：</strong>朋友关系是单向且唯一的。只有主动认识的用户会获得朋友数加分。如果A已经认识了B，则B不能再认识A，避免重复关系。
                  </div>
                  
                  {/* 主动认识的用户选择 */}
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">主动认识的用户 *</label>
                    
                    {/* 筛选区域 */}
                    <div style={{
                      background: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
                              按组别筛选
                            </label>
                            <select
                              value={selectedTeamGroup1}
                              onChange={(e) => setSelectedTeamGroup1(e.target.value)}
                              className="form-select"
                              style={{ fontSize: '14px', padding: '6px 8px', minWidth: 90 }}
                              disabled={addingFriendship}
                            >
                              <option value="">全部组别</option>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((group) => (
                                <option key={group} value={group}>
                                  第{group}组
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
                              搜索用户
                            </label>
                            <div style={{ position: 'relative' }}>
                              <Search size={14} style={{ 
                                position: 'absolute', 
                                left: '8px', 
                                top: '50%', 
                                transform: 'translateY(-50%)',
                                color: '#666'
                              }} />
                              <input
                                type="text"
                                value={userSearchTerm1}
                                onChange={(e) => setUserSearchTerm1(e.target.value)}
                                placeholder="姓名或使徒名"
                                style={{ 
                                  width: '100%',
                                  fontSize: '14px', 
                                  padding: '6px 8px 6px 28px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px'
                                }}
                                disabled={addingFriendship}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {(selectedGroup1 || userSearchTerm1 || selectedTeamGroup1) && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                          找到 {getFilteredUsers1().length} 位用户
                        </div>
                      )}
                    </div>
                    
                    <select
                      name="user1"
                      value={formData.user1}
                      onChange={handleFormChange}
                      className="form-select"
                      disabled={addingFriendship}
                      required
                    >
                      <option value="">选择用户</option>
                      {getFilteredUsers1().map(user => (
                        console.log(user),
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.disciple} ({user.gender}) - 第{user.team_group}组
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 被认识的用户选择 */}
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">被认识的用户 *</label>
                    
                    {/* 筛选区域 */}
                    <div style={{
                      background: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
                              按组别筛选
                            </label>
                            <select
                              value={selectedTeamGroup2}
                              onChange={(e) => setSelectedTeamGroup2(e.target.value)}
                              className="form-select"
                              style={{ fontSize: '14px', padding: '6px 8px', minWidth: 90 }}
                              disabled={addingFriendship}
                            >
                              <option value="">全部组别</option>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((group) => (
                                <option key={group} value={group}>
                                  第{group}组
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
                              搜索用户
                            </label>
                            <div style={{ position: 'relative' }}>
                              <Search size={14} style={{ 
                                position: 'absolute', 
                                left: '8px', 
                                top: '50%', 
                                transform: 'translateY(-50%)',
                                color: '#666'
                              }} />
                              <input
                                type="text"
                                value={userSearchTerm2}
                                onChange={(e) => setUserSearchTerm2(e.target.value)}
                                placeholder="姓名或使徒名"
                                style={{ 
                                  width: '100%',
                                  fontSize: '14px', 
                                  padding: '6px 8px 6px 28px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px'
                                }}
                                disabled={addingFriendship}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {(selectedGroup2 || userSearchTerm2 || selectedTeamGroup2) && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                          找到 {getFilteredUsers2().length} 位用户
                        </div>
                      )}
                    </div>
                    
                    <select
                      name="user2"
                      value={formData.user2}
                      onChange={handleFormChange}
                      className="form-select"
                      disabled={addingFriendship}
                      required
                    >
                      <option value="">选择用户</option>
                      {getFilteredUsers2().map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.disciple} ({user.gender}) - 第{user.team_group}组
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">备注 (可选)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                      className="form-input"
                      placeholder="记录他们是如何认识的..."
                      rows="2"
                      disabled={addingFriendship}
                    />
                  </div>

                  <div className="grid grid-2" style={{ gap: '12px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={addingFriendship}
                    >
                      {addingFriendship ? (
                        <div className="loading">
                          <div className="spinner"></div>
                          建立中...
                        </div>
                      ) : (
                        <>
                          <Plus size={20} />
                          建立认识关系
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-secondary"
                      disabled={addingFriendship}
                    >
                      重置表单
                    </button>
                  </div>
                </form>

                {/* 搜索功能 */}
                <div className="search-container mb-4" style={{ 
                  paddingTop: '16px',
                  borderTop: '1px solid #e9ecef'
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#666'
                    }} />
                    <input
                      type="text"
                      placeholder="搜索认识关系..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                </div>

                {/* 朋友关系列表 */}
                <div>
                  <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
                    <Users size={20} style={{ marginRight: '8px' }} />
                    认识关系列表
                    {filteredFriendships.length !== friendships.length && (
                      <span style={{ color: '#666', fontSize: '14px', fontWeight: 'normal', marginLeft: '8px' }}>
                        （显示 {filteredFriendships.length} / {friendships.length} 个）
                      </span>
                    )}
                  </h3>

                  {filteredFriendships.length === 0 ? (
                    <div className="text-center" style={{ padding: '2rem', color: '#666' }}>
                      {searchTerm ? '没有找到匹配的认识关系' : '暂无认识关系'}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {filteredFriendships.map(friendship => (
                        <div key={friendship.id} className="friendship-card" style={{
                          background: '#f8f9fa',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid #e9ecef',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                              {/* 第一个用户信息和分组标识 */}
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                  width: '8px',
                                  height: '8px',  
                                  borderRadius: '50%',
                                  backgroundColor: getGroupColor(getDiscipleGroup(friendship.user1.disciple)),
                                  marginRight: '6px'
                                }}></div>
                                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                  {friendship.user1.name}
                                </span>
                              </div>
                              
                              <span style={{ margin: '0 12px', color: '#667eea' }}>→</span>
                              
                              {/* 第二个用户信息和分组标识 */}
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: getGroupColor(getDiscipleGroup(friendship.user2.disciple)),
                                  marginRight: '6px'
                                }}></div>
                                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                  {friendship.user2.name}
                                </span>
                              </div>
                            </div>
                            
                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                              <span style={{ 
                                color: getGroupColor(getDiscipleGroup(friendship.user1.disciple)),
                                fontWeight: '500'
                              }}>
                                {friendship.user1.disciple}
                              </span>
                              <span> · {friendship.user1.gender} · 第{friendship.user1.team_group}组</span> 
                              <span style={{ color: '#999' }}> ← → </span>
                              <span style={{ 
                                color: getGroupColor(getDiscipleGroup(friendship.user2.disciple)),
                                fontWeight: '500'
                              }}>
                                {friendship.user2.disciple}
                              </span>
                              <span> · {friendship.user2.gender} · 第{friendship.user2.team_group}组</span>
                            </div>
                            
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                              <span style={{ 
                                backgroundColor: getGroupColor(getDiscipleGroup(friendship.user1.disciple)) + '20',
                                color: getGroupColor(getDiscipleGroup(friendship.user1.disciple)),
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                marginRight: '8px'
                              }}>
                                {getGroupDisplayName(getDiscipleGroup(friendship.user1.disciple))}
                              </span>
                              <span style={{ 
                                backgroundColor: getGroupColor(getDiscipleGroup(friendship.user2.disciple)) + '20',
                                color: getGroupColor(getDiscipleGroup(friendship.user2.disciple)),
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '11px'
                              }}>
                                {getGroupDisplayName(getDiscipleGroup(friendship.user2.disciple))}
                              </span>
                            </div>
                            
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {new Date(friendship.created_at).toLocaleDateString('zh-CN')}
                            </div>

                            {friendship.notes && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#666',
                                fontStyle: 'italic',
                                background: 'white',
                                padding: '8px',
                                borderRadius: '6px',
                                marginTop: '8px'
                              }}>
                                "{friendship.notes}"
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => deleteFriendship(friendship.id)}
                            className="btn btn-danger"
                            style={{ padding: '8px 12px', marginLeft: '16px' }}
                            disabled={deletingFriendship === friendship.id}
                          >
                            {deletingFriendship === friendship.id ? (
                              <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PagePasswordGuard>
  );
}

export default FriendshipPage; 