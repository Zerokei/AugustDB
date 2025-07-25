import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getDiscipleGroup, getGroupDisplayName, getGroupColor } from '../lib/discipleConfig';
import { UserPlus, Settings, Trash2, Home, Search, ChevronLeft, ChevronRight, Users, BarChart3, UserPlus2, Heart, Trophy, MessageCircle, LogOut, Calendar, Play } from 'lucide-react';
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

function HomePage({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userFriends, setUserFriends] = useState({}); // 存储每个用户的朋友数量
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(12); // 每页显示12个用户
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('name'); // 'name', 'disciple', 'all'

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // 搜索过滤
    let filtered = users;
    
    if (searchTerm.trim()) {
      filtered = users.filter(user => {
        const term = searchTerm.toLowerCase().trim();
        switch (searchBy) {
          case 'name':
            return user.name.toLowerCase().includes(term);
          case 'disciple':
            return user.disciple.toLowerCase().includes(term);
          case 'all':
            return user.name.toLowerCase().includes(term) || 
                   user.disciple.toLowerCase().includes(term) ||
                   user.gender.toLowerCase().includes(term);
          default:
            return true;
        }
      });
    }
    
    setFilteredUsers(filtered);
    setCurrentPage(1); // 搜索时重置到第一页
  }, [users, searchTerm, searchBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchUserFriendCounts()
      ]);
    } catch (error) {
      setMessage({ type: 'error', text: '获取数据失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setUsers(data || []);
  };

  const fetchUserFriendCounts = async () => {
    try {
      // 获取所有朋友关系
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('user1_id, user2_id');

      if (error) throw error;

      // 计算每个用户的朋友数量（只计算作为主动方的关系）
      const friendCounts = {};
      
      if (friendships) {
        friendships.forEach(friendship => {
          // 只为主动建立关系的用户（user1）增加朋友计数
          friendCounts[friendship.user1_id] = (friendCounts[friendship.user1_id] || 0) + 1;
        });
      }

      setUserFriends(friendCounts);
    } catch (error) {
      console.error('获取朋友数量失败：', error);
      setUserFriends({});
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('确定要注销这个用户吗？此操作不可撤销。')) {
      return;
    }

    try {
      setDeleteLoading(userId);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      setMessage({ type: 'success', text: '用户已成功注销' });
      fetchData(); // 重新获取数据
    } catch (error) {
      setMessage({ type: 'error', text: '注销用户失败：' + error.message });
    } finally {
      setDeleteLoading(null);
    }
  };

  const clearMessage = () => {
    setMessage({ type: '', text: '' });
  };

  // 分页计算
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // 统计信息
  const stats = {
    total: users.length,
    male: users.filter(u => u.gender === '男').length,
    female: users.filter(u => u.gender === '女').length,
    avgCourage: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.courage || 0), 0) / users.length) : 0,
    avgFaith: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.faith || 0), 0) / users.length) : 0,
    avgWisdom: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.wisdom || 0), 0) / users.length) : 0,
    totalFriendships: Object.values(userFriends).reduce((sum, count) => sum + count, 0), // 单向关系，不需要除以2
  };

  return (
    <div className="page-container">
      <div className="page-content" style={{ maxWidth: '1200px' }}>
        <div className="header">
          <h1>
            <Home className="inline" size={32} />
            Campfire
          </h1>
        </div>

        <div className="card">
          {message.text && (
            <div className={`${message.type === 'error' ? 'error-message' : 'success-message'}`}>
              {message.text}
              <button 
                onClick={clearMessage}
                style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          )}

          {/* 快捷操作按钮 */}
          <div className="grid grid-4 mb-4">
            <Link to="/register" className="btn btn-primary">
              <UserPlus size={20} />
              用户管理
            </Link>
            <Link to="/attributes" className="btn btn-secondary">
              <Settings size={20} />
              属性管理
            </Link>
            <Link to="/friendship" className="btn btn-secondary">
              <UserPlus2 size={20} />
              朋友结交
            </Link>
            
            <Link to="/ranking/live" className="btn btn-secondary">
              <Play size={20} />
              日常滚榜
            </Link>
            
                      <Link to="/moments" className="btn btn-secondary">
            <MessageCircle size={20} />
            朋友圈
          </Link>
          
          {onLogout && (
            <button 
              onClick={onLogout}
              className="btn btn-danger"
              style={{ marginTop: '1rem' }}
            >
              <LogOut size={20} />
              退出登录
            </button>
          )}
        </div>

          {/* 统计信息 */}
          {users.length > 0 && (
            <div className="stats-container mb-4" style={{ 
              background: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
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
        </div>
      </div>
    </div>
  );
}

export default HomePage; 