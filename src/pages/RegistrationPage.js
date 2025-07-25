import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, ROLE_TYPES } from '../lib/supabase';
import { getDiscipleInitialValues, getDiscipleGroup, getGroupDisplayName, getGroupColor } from '../lib/discipleConfig';
import { ArrowLeft, UserPlus, User, Users, BarChart3, Heart, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import PagePasswordGuard from '../components/PagePasswordGuard';

// 复制自HomePage.js
const getCardTheme = (discipleGroup) => {
  switch (discipleGroup) {
    case 'wisdom':
      return {
        background: 'linear-gradient(135deg, #ebf3fd 0%, #d6e9fc 100%)',
        border: '2px solid #3498db',
        shadowColor: 'rgba(52, 152, 219, 0.2)',
        textColor: '#2c3e50',
        attributeBg: '#ffffff'
      };
    case 'courage':
      return {
        background: 'linear-gradient(135deg, #fdf2f2 0%, #fce8e8 100%)',
        border: '2px solid #e74c3c',
        shadowColor: 'rgba(231, 76, 60, 0.2)',
        textColor: '#2c3e50',
        attributeBg: '#ffffff'
      };
    case 'faith':
      return {
        background: 'linear-gradient(135deg, #fef9e7 0%, #fcf3cf 100%)',
        border: '2px solid #f39c12',
        shadowColor: 'rgba(243, 156, 18, 0.2)',
        textColor: '#2c3e50',
        attributeBg: '#ffffff'
      };
    default:
      return {
        background: '#f8f9fa',
        border: '1px solid #e9ecef',
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        textColor: '#333',
        attributeBg: '#ffffff'
      };
  }
};

function RegistrationPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    disciple: '',
    gender: '',
    teamGroup: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userFriends, setUserFriends] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(12);
  // 搜索
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('name');

  React.useEffect(() => {
    fetchUserData();
  }, []);
  React.useEffect(() => {
    let filtered = users;
    if (searchTerm.trim()) {
      filtered = users.filter(user => {
        const term = searchTerm.toLowerCase().trim();
        switch (searchBy) {
          case 'name': return user.name.toLowerCase().includes(term);
          case 'disciple': return user.disciple.toLowerCase().includes(term);
          case 'all': return user.name.toLowerCase().includes(term) || user.disciple.toLowerCase().includes(term) || user.gender.toLowerCase().includes(term);
          default: return true;
        }
      });
    }
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchTerm, searchBy]);

  const fetchUserData = async () => {
    try {
      setLoadingUsers(true);
      await Promise.all([
        fetchUsers(),
        fetchUserFriendCounts()
      ]);
    } finally {
      setLoadingUsers(false);
    }
  };
  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
  };
  const fetchUserFriendCounts = async () => {
    const { data: friendships, error } = await supabase.from('friendships').select('user1_id, user2_id');
    const friendCounts = {};
    if (friendships) {
      friendships.forEach(friendship => {
        friendCounts[friendship.user1_id] = (friendCounts[friendship.user1_id] || 0) + 1;
      });
    }
    setUserFriends(friendCounts);
  };
  const deleteUser = async (userId) => {
    if (!window.confirm('确定要注销这个用户吗？此操作不可撤销。')) return;
    try {
      setDeleteLoading(userId);
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (!error) fetchUserData();
    } finally {
      setDeleteLoading(null);
    }
  };
  // 分页
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);
  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  // 统计
  const stats = {
    total: users.length,
    male: users.filter(u => u.gender === '男').length,
    female: users.filter(u => u.gender === '女').length,
    avgCourage: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.courage || 0), 0) / users.length) : 0,
    avgFaith: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.faith || 0), 0) / users.length) : 0,
    avgWisdom: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.wisdom || 0), 0) / users.length) : 0,
    totalFriendships: Object.values(userFriends).reduce((sum, count) => sum + count, 0),
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '请输入姓名' });
      return false;
    }
    if (!formData.disciple) {
      setMessage({ type: 'error', text: '请选择使徒' });
      return false;
    }
    if (!formData.gender) {
      setMessage({ type: 'error', text: '请选择性别' });
      return false;
    }
    if (!formData.teamGroup) {
      setMessage({ type: 'error', text: '请选择组别' });
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
      setLoading(true);
      setMessage({ type: '', text: '' });

      // 检查姓名是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('name')
        .eq('name', formData.name.trim())
        .single();

      if (existingUser) {
        setMessage({ type: 'error', text: '该姓名已被注册，请使用其他姓名' });
        return;
      }

      const initialValues = getDiscipleInitialValues(formData.disciple);
      
      // 创建新用户
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            name: formData.name.trim(),
            disciple: formData.disciple,
            gender: formData.gender,
            team_group: parseInt(formData.teamGroup),
            courage: initialValues.courage,
            faith: initialValues.faith,
            wisdom: initialValues.wisdom
          }
        ])
        .select();

      if (error) throw error;

      setMessage({ type: 'success', text: '用户登记成功！' });
      
      // 2秒后跳转到首页
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      setMessage({ type: 'error', text: '登记失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      disciple: '',
      gender: '',
      teamGroup: ''
    });
    setMessage({ type: '', text: '' });
  };

  return (
    <PagePasswordGuard pageKey="register" pagePassword="Reg1St3r">
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
              <User size={32} />
              用户登记
            </h1>
            <p>登记新的用户信息</p>
          </div>

          <div className="card">
            {message.text && (
              <div className={`${message.type === 'error' ? 'error-message' : 'success-message'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  姓名 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="请输入姓名"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="disciple">
                  选择使徒 *
                </label>
                <select
                  id="disciple"
                  name="disciple"
                  value={formData.disciple}
                  onChange={handleInputChange}
                  className="form-select"
                  disabled={loading}
                  required
                >
                  <option value="">请选择一位使徒</option>
                  {ROLE_TYPES.map((disciple) => (
                    <option key={disciple} value={disciple}>
                      {disciple}
                    </option>
                  ))}
                </select>
              </div>

              {/* 用户组别信息显示 */}
              {formData.disciple && (
                <div className="disciple-info" style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: getGroupColor(getDiscipleGroup(formData.disciple)),
                  backgroundColor: getGroupColor(getDiscipleGroup(formData.disciple)) + '15',
                  marginBottom: '24px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '8px' 
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: getGroupColor(getDiscipleGroup(formData.disciple))
                    }}></div>
                    <strong>{getGroupDisplayName(getDiscipleGroup(formData.disciple))}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    初始属性值：
                    {(() => {
                      const values = getDiscipleInitialValues(formData.disciple);
                      const attrs = [];
                      if (values.courage > 0) attrs.push(`勇气 ${values.courage}`);
                      if (values.faith > 0) attrs.push(`信心 ${values.faith}`);
                      if (values.wisdom > 0) attrs.push(`智力 ${values.wisdom}`);
                      return attrs.join('、');
                    })()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    注：该用户后续只能增加对应属性的点数
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="teamGroup">
                  选择组别 *
                </label>
                <select
                  id="teamGroup"
                  name="teamGroup"
                  value={formData.teamGroup}
                  onChange={handleInputChange}
                  className="form-select"
                  disabled={loading}
                  required
                >
                  <option value="">请选择组别</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((group) => (
                    <option key={group} value={group}>
                      第{group}组
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  性别 *
                </label>
                <div className="grid grid-2">
                  <label className="gender-option">
                    <input
                      type="radio"
                      name="gender"
                      value="男"
                      checked={formData.gender === '男'}
                      onChange={handleInputChange}
                      disabled={loading}
                      style={{ marginRight: '8px' }}
                    />
                    男
                  </label>
                  <label className="gender-option">
                    <input
                      type="radio"
                      name="gender"
                      value="女"
                      checked={formData.gender === '女'}
                      onChange={handleInputChange}
                      disabled={loading}
                      style={{ marginRight: '8px' }}
                    />
                    女
                  </label>
                </div>
              </div>

              <div className="grid grid-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="loading">
                      <div className="spinner"></div>
                      登记中...
                    </div>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      确认登记
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
          </div>
          {/* 用户管理区块 */}
          <div className="card" style={{ marginTop: '2rem' }}>
            <div className="header" style={{ marginBottom: '1rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', margin: 0 }}>
                <Users size={20} /> 用户管理
              </h2>
              <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>可搜索、分页、删除用户</p>
            </div>
            {/* 统计信息 */}
            {users.length > 0 && (
              <div className="stats-container mb-4" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <BarChart3 size={20} style={{ marginRight: '8px', color: '#667eea' }} />
                  <h3 style={{ margin: 0, fontSize: '16px' }}>统计概览</h3>
                </div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div className="stat-item">
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>{stats.total}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>总成员数</div>
                  </div>
                  <div className="stat-item">
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      男性: <span style={{ fontWeight: 'bold', color: '#333' }}>{stats.male}</span> | 
                      女性: <span style={{ fontWeight: 'bold', color: '#333' }}>{stats.female}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      平均属性: 勇气{stats.avgCourage} | 信心{stats.avgFaith} | 智力{stats.avgWisdom}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#e74c3c' }}>
                      {stats.totalFriendships}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>认识数量</div>
                  </div>
                </div>
              </div>
            )}
            {/* 搜索功能 */}
            <div className="search-container mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input type="text" placeholder="搜索用户..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input" style={{ paddingLeft: '44px' }} />
              </div>
              <select value={searchBy} onChange={e => setSearchBy(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: '120px' }}>
                <option value="name">按姓名</option>
                <option value="disciple">按使徒</option>
                <option value="all">全部</option>
              </select>
            </div>
            {/* 用户列表 */}
            <div className="mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>
                  <Users size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  已登记的用户
                  {filteredUsers.length !== users.length && (
                    <span style={{ color: '#666', fontSize: '14px', fontWeight: 'normal' }}>（显示 {filteredUsers.length} / {users.length} 个）</span>
                  )}
                </h2>
                {/* 分页信息 */}
                {totalPages > 1 && (
                  <div style={{ fontSize: '14px', color: '#666' }}>第 {currentPage} / {totalPages} 页</div>
                )}
              </div>
              {loadingUsers ? (
                <div className="text-center"><div className="loading"><div className="spinner"></div>正在加载...</div></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center" style={{ color: '#666', padding: '2rem' }}>{searchTerm ? '没有找到匹配的用户' : '暂无登记的用户，请先进行用户登记'}</div>
              ) : (
                <>
                  {/* 用户卡片网格 */}
                  <div className="users-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {currentUsers.map((user) => {
                      const discipleGroup = getDiscipleGroup(user.disciple);
                      const cardTheme = getCardTheme(discipleGroup);
                      return (
                        <div key={user.id} className="user-card-compact" style={{ background: cardTheme.background, padding: '18px', borderRadius: '16px', border: cardTheme.border, position: 'relative', boxShadow: `0 4px 12px ${cardTheme.shadowColor}, 0 2px 4px rgba(0,0,0,0.05)`, transition: 'all 0.3s ease', transform: 'translateY(0)', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${cardTheme.shadowColor}, 0 4px 8px rgba(0,0,0,0.1)`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 12px ${cardTheme.shadowColor}, 0 2px 4px rgba(0,0,0,0.05)`; }}
                        >
                          {/* 用户基本信息 */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: cardTheme.textColor, fontWeight: '600' }}>{user.name}</h3>
                                <div style={{ fontSize: '13px', color: cardTheme.textColor, opacity: '0.8' }}>{user.disciple} · {user.gender} · 第{user.team_group}组 · {new Date(user.created_at).toLocaleDateString('zh-CN')}</div>
                                {/* 用户组别标识 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getGroupColor(getDiscipleGroup(user.disciple)) }}></div>
                                  <span style={{ fontSize: '11px', color: getGroupColor(getDiscipleGroup(user.disciple)), fontWeight: 'bold' }}>{getGroupDisplayName(getDiscipleGroup(user.disciple))}</span>
                                </div>
                                {/* 朋友数量显示 */}
                                <div style={{ fontSize: '12px', color: getGroupColor(discipleGroup), marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                                  <Heart size={12} fill={getGroupColor(discipleGroup)} />
                                  {userFriends[user.id] || 0} 个朋友
                                </div>
                              </div>
                              <button onClick={() => deleteUser(user.id)} className="btn btn-danger" style={{ padding: '8px 10px', fontSize: '12px', minHeight: 'auto', borderRadius: '8px', border: 'none', background: 'rgba(220, 53, 69, 0.1)', color: '#dc3545', transition: 'all 0.2s ease' }}
                                onMouseEnter={e => { e.target.style.background = '#dc3545'; e.target.style.color = 'white'; }}
                                onMouseLeave={e => { e.target.style.background = 'rgba(220, 53, 69, 0.1)'; e.target.style.color = '#dc3545'; }}
                                disabled={deleteLoading === user.id}
                              >
                                {deleteLoading === user.id ? (<div className="spinner" style={{ width: '12px', height: '12px' }}></div>) : (<Trash2 size={12} />)}
                              </button>
                            </div>
                          </div>
                          {/* 属性值 - 紧凑显示 */}
                          {(user.courage || user.faith || user.wisdom) ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                              <div className="attribute-compact" style={{ textAlign: 'center', padding: '10px 6px', background: cardTheme.attributeBg, borderRadius: '8px', border: `1px solid ${getGroupColor(discipleGroup)}30`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e74c3c' }}>{user.courage || 0}</div>
                                <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>勇气</div>
                              </div>
                              <div className="attribute-compact" style={{ textAlign: 'center', padding: '10px 6px', background: cardTheme.attributeBg, borderRadius: '8px', border: `1px solid ${getGroupColor(discipleGroup)}30`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f39c12' }}>{user.faith || 0}</div>
                                <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>信心</div>
                              </div>
                              <div className="attribute-compact" style={{ textAlign: 'center', padding: '10px 6px', background: cardTheme.attributeBg, borderRadius: '8px', border: `1px solid ${getGroupColor(discipleGroup)}30`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3498db' }}>{user.wisdom || 0}</div>
                                <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>智力</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', color: '#999', fontSize: '12px', padding: '12px' }}>暂无属性点数</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* 分页控件 */}
                  {totalPages > 1 && (
                    <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e9ecef' }}>
                      <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="btn btn-secondary" style={{ padding: '8px 12px', opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
                      {/* 页码按钮 */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages).map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (<span style={{ color: '#666', padding: '0 4px' }}>...</span>)}
                            <button onClick={() => goToPage(page)} className={`btn ${page === currentPage ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', minWidth: '40px' }}>{page}</button>
                          </React.Fragment>
                        );
                      })}
                      <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-secondary" style={{ padding: '8px 12px', opacity: currentPage === totalPages ? 0.5 : 1 }}><ChevronRight size={16} /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PagePasswordGuard>
  );
}

export default RegistrationPage; 