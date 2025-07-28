import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Play, UserPlus2, MessageCircle, Trophy, Medal, Award, Calendar, Zap, Heart, Brain, BarChart3 } from 'lucide-react';
import PagePasswordGuard from '../components/PagePasswordGuard';

function LiveRankingPage() {
  const [socialRanking, setSocialRanking] = useState([]);
  const [todayMoments, setTodayMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 滚动播放状态
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0); // 当前显示的5人组索引
  
  // 多榜单状态
  const [rankings, setRankings] = useState({
    courage: [],
    faith: [],
    wisdom: [],
    friendship: []
  });
  const [currentRankingTab, setCurrentRankingTab] = useState(0); // 0-勇气 1-信心 2-智力 3-社牛
  const rankingTabs = [
    { key: 'courage', label: '勇气', icon: <Zap size={18} style={{ color: '#e74c3c' }} /> },
    { key: 'faith', label: '信心', icon: <Heart size={18} style={{ color: '#f39c12' }} /> },
    { key: 'wisdom', label: '智力', icon: <Brain size={18} style={{ color: '#3498db' }} /> },
    { key: 'friendship', label: '社牛', icon: <UserPlus2 size={18} style={{ color: '#28a745' }} /> },
  ];
  const rankingTabIntervalRef = useRef(null);

  // 定时器引用
  const momentsIntervalRef = useRef(null);
  const rankingIntervalRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // 自动刷新功能，每5min刷新一次数据
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 300000); // 5min
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
    return () => {
      stopAutoPlay();
    };
  }, [isPlaying, todayMoments.length, rankings.courage.length, rankings.faith.length, rankings.wisdom.length, rankings.friendship.length]);

  // 自动切换榜单tab
  useEffect(() => {
    if (isPlaying) {
      rankingTabIntervalRef.current = setInterval(() => {
        setCurrentRankingTab(prev => (prev + 1) % rankingTabs.length);
      }, 4000);
    } else {
      if (rankingTabIntervalRef.current) clearInterval(rankingTabIntervalRef.current);
    }
    return () => {
      if (rankingTabIntervalRef.current) clearInterval(rankingTabIntervalRef.current);
    };
  }, [isPlaying]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAllRankings(),
        fetchTodayMoments()
      ]);
    } catch (error) {
      setMessage({ type: 'error', text: '获取数据失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 获取四榜单
  const fetchAllRankings = async () => {
    await Promise.all([
      fetchAttributeRanking('courage'),
      fetchAttributeRanking('faith'),
      fetchAttributeRanking('wisdom'),
      fetchFriendshipRanking()
    ]);
  };

  // 勇气/信心/智力榜
  const fetchAttributeRanking = async (attribute) => {
    const { data: topTen, error: topTenError } = await supabase
      .from('users')
      .select('id, name, disciple, gender, courage, faith, wisdom, team_group')
      .gt(attribute, 0)
      .order(attribute, { ascending: false })
      .limit(10);
    if (topTenError) return;
    if (!topTen || topTen.length === 0) {
      setRankings(prev => ({ ...prev, [attribute]: [] }));
      return;
    }
    if (topTen.length < 10) {
      setRankings(prev => ({ ...prev, [attribute]: topTen }));
      return;
    }
    const tenthScore = topTen[9][attribute];
    const { data: allData, error } = await supabase
      .from('users')
      .select('id, name, disciple, gender, courage, faith, wisdom, team_group')
      .gte(attribute, tenthScore)
      .gt(attribute, 0)
      .order(attribute, { ascending: false });
    if (error) return;
    setRankings(prev => ({ ...prev, [attribute]: allData || [] }));
  };

  // 社牛榜
  const fetchFriendshipRanking = async () => {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, disciple, gender, team_group');
    if (usersError) return;
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('user1_id, user2_id');
    if (friendshipsError) return;
    const friendCounts = {};
    users.forEach(user => { friendCounts[user.id] = 0; });
    friendships.forEach(friendship => {
      if (friendCounts[friendship.user1_id] !== undefined) {
        friendCounts[friendship.user1_id]++;
      }
    });
    const friendshipData = users
      .map(user => ({ ...user, friendCount: friendCounts[user.id] }))
      .filter(user => user.friendCount > 0)
      .sort((a, b) => b.friendCount - a.friendCount);
    if (friendshipData.length <= 10) {
      setRankings(prev => ({ ...prev, friendship: friendshipData }));
      return;
    }
    const topTen = friendshipData.slice(0, 10);
    const tenthScore = topTen[9].friendCount;
    const friendshipRanking = friendshipData.filter(user => user.friendCount >= tenthScore);
    setRankings(prev => ({ ...prev, friendship: friendshipRanking }));
  };

  // 获取榜单显示内容
  const getAttributeValue = (user, attribute) => {
    switch (attribute) {
      case 'courage': return user.courage;
      case 'faith': return user.faith;
      case 'wisdom': return user.wisdom;
      case 'friendship': return user.friendCount;
      default: return 0;
    }
  };
  const getAttributeIcon = (attribute) => {
    switch (attribute) {
      case 'courage': return <Zap size={16} style={{ color: '#e74c3c' }} />;
      case 'faith': return <Heart size={16} style={{ color: '#f39c12' }} />;
      case 'wisdom': return <Brain size={16} style={{ color: '#3498db' }} />;
      case 'friendship': return <UserPlus2 size={16} style={{ color: '#28a745' }} />;
      default: return null;
    }
  };
  const getAttributeName = (attribute) => {
    switch (attribute) {
      case 'courage': return '勇气';
      case 'faith': return '信心';
      case 'wisdom': return '智力';
      case 'friendship': return '社牛';
      default: return '';
    }
  };

  const fetchTodayMoments = async () => {
    // 获取当前时间和12小时前的时间
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 改为12小时


    const { data: momentsData, error } = await supabase
      .from('moments')
      .select(`
        id,
        user_id,
        title,
        content,
        image_url,
        created_at,
        users(name, disciple, gender)
      `)
      .gte('created_at', twoHoursAgo.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;

    // 获取每个动态的@用户信息
    const momentsWithMentions = await Promise.all(
      (momentsData || []).map(async (moment) => {
        const { data: mentions, error: mentionError } = await supabase
          .from('moment_mentions')
          .select(`
            mentioned_user_id,
            users!inner(id, name, disciple)
          `)
          .eq('moment_id', moment.id);

        if (mentionError) {
          console.error('获取@用户信息失败：', mentionError);
        }

        return {
          ...moment,
          user_name: moment.users?.name || '未知用户',
          user_disciple: moment.users?.disciple || '',
          user_gender: moment.users?.gender || '',
          mentioned_users: mentions ? mentions.map(m => m.users).filter(user => user !== null) : []
        };
      })
    );

    setTodayMoments(momentsWithMentions);
  };

  const startAutoPlay = () => {
    // 社牛排名5人组滚动（每4秒切换一组）
    if (socialRanking.length > 5) {
      const totalGroups = Math.ceil(socialRanking.length / 5);
      rankingIntervalRef.current = setInterval(() => {
        setCurrentGroupIndex(prev => (prev + 1) % totalGroups);
      }, 4000);
    }

    // 朋友圈滚动（每5秒切换一个）
    if (todayMoments.length > 0) {
      momentsIntervalRef.current = setInterval(() => {
        setCurrentMomentIndex(prev => (prev + 1) % todayMoments.length);
      }, 5000);
    }
  };

  const stopAutoPlay = () => {
    if (rankingIntervalRef.current) {
      clearInterval(rankingIntervalRef.current);
      rankingIntervalRef.current = null;
    }
    if (momentsIntervalRef.current) {
      clearInterval(momentsIntervalRef.current);
      momentsIntervalRef.current = null;
    }
  };



  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="rank-icon gold" size={20} />;
      case 2:
        return <Medal className="rank-icon silver" size={20} />;
      case 3:
        return <Award className="rank-icon bronze" size={20} />;
      default:
        return <span className="rank-number" style={{ fontSize: '16px', fontWeight: 'bold' }}>{rank}</span>;
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentMoment = todayMoments[currentMomentIndex];

  return (
    <PagePasswordGuard pageKey="rank" pagePassword="5anK">
      <div className="page-container">
        <div className="navigation">
          <Link to="/" className="nav-button">
            <ArrowLeft size={20} />
            返回首页
          </Link>
        </div>
        <div className="page-content" style={{ maxWidth: '1300px' }}>
          <div className="header" style={{ marginBottom: '16px' }}>
            <h1 style={{ marginBottom: '8px' }}>
              <Play size={28} />
              日常滚榜
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>社牛排名和今日朋友圈动态自动轮播展示</p>
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
                  正在加载数据...
                </div>
              </div>
            ) : (
              <>
                {/* 自动滚播提示 */}
                <div className="auto-play-indicator" style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '6px', 
                  marginBottom: '16px',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  <Play size={14} />
                                   自动轮播中
                  <div className="pulse-dot" style={{
                    width: '6px',
                    height: '6px',
                    background: '#fff',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}></div>
                </div>

                <div className="live-content" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '300px 1fr', 
                  gap: '16px',
                  '@media (max-width: 768px)': {
                    gridTemplateColumns: '1fr'
                  }
                }}>
                  {/* 社牛排名滚动区域 -> 多榜单滚动区域 */}
                  <div className="social-ranking-section">
                    <div className="section-header" style={{
                      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', background: '#667eea', color: 'white', borderRadius: '6px'
                    }}>
                      <BarChart3 size={20} />
                      <h3 style={{ margin: 0, fontSize: '16px' }}>属性/社牛总榜</h3>
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: 'auto' }}>
                        {rankingTabs[currentRankingTab].label}榜
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      {rankingTabs.map((tab, idx) => (
                        <button key={tab.key} onClick={() => setCurrentRankingTab(idx)} style={{
                          background: idx === currentRankingTab ? '#667eea' : '#f0f0f0',
                          color: idx === currentRankingTab ? 'white' : '#666',
                          border: 'none', borderRadius: '8px', padding: '4px 12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                        }}>{tab.icon}{tab.label}</button>
                      ))}
                    </div>
                    {/* 榜单内容 */}
                    <div className="ranking-list-display" style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #e8eeff 100%)', padding: '12px', borderRadius: '10px', border: '2px solid #667eea', minHeight: '500px', transition: 'all 0.5s ease' }}>
                      {(() => {
                        const attribute = rankingTabs[currentRankingTab].key;
                        const rankingData = rankings[attribute] || [];
                        if (rankingData.length === 0) {
                          return <div className="text-center" style={{ padding: '2rem', color: '#666' }}><BarChart3 size={40} style={{ margin: '0 auto 0.8rem', opacity: 0.3 }} /><p style={{ margin: 0, fontSize: '14px' }}>暂无{getAttributeName(attribute)}排名数据</p></div>;
                        }
                        return rankingData.slice(0, 10).map((user, index) => {
                          const rank = index + 1;
                          return (
                            <div key={user.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', marginBottom: '8px', background: rank <= 3 ? 'rgba(102, 126, 234, 0.1)' : 'white', borderRadius: '8px', border: rank <= 3 ? '1px solid #667eea' : '1px solid #e9ecef', transition: 'all 0.3s ease' }}>
                              <div style={{ minWidth: '32px', textAlign: 'center', marginRight: '8px' }}>
                                {rank <= 3 ? getRankIcon(rank) : <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>{rank}</span>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {user.name}
                                  {/* 新增小组显示 */}
                                  {user.team_group && (
                                    <span style={{ color: '#667eea', fontSize: '12px', marginLeft: '8px' }}>
                                      第{user.team_group}组
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.disciple}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '16px', fontWeight: 'bold', color: rank <= 3 ? '#667eea' : '#333' }}>
                                {getAttributeValue(user, attribute)}
                                {getAttributeIcon(attribute)}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* 朋友圈滚动区域 */}
                  <div className="moments-section">
                    <div className="section-header" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      padding: '8px 12px',
                      background: '#28a745',
                      color: 'white',
                      borderRadius: '6px'
                    }}>
                      <MessageCircle size={20} />
                      <h3 style={{ margin: 0, fontSize: '16px' }}>今日朋友圈</h3>
                      <Calendar size={18} />
                      {todayMoments.length > 0 && (
                        <span style={{
                          background: 'rgba(255,255,255,0.2)',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          marginLeft: 'auto'
                        }}>
                          {currentMomentIndex + 1} / {todayMoments.length}
                        </span>
                      )}
                    </div>

                    {todayMoments.length === 0 ? (
                      <div className="text-center" style={{ padding: '2rem', color: '#666' }}>
                        <MessageCircle size={40} style={{ margin: '0 auto 0.8rem', opacity: 0.3 }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>今天还没有朋友圈动态</p>
                      </div>
                    ) : (
                      <div className="moment-display" style={{
                        background: 'linear-gradient(135deg, #f8fff8 0%, #e8ffe8 100%)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px solid #28a745',
                        minHeight: '500px',
                        height: 'fit-content',
                        transition: 'all 0.5s ease'
                      }}>
                        <div className="moment-header" style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <div className="moment-title" style={{
                            fontSize: '22px',
                            fontWeight: 'bold',
                            color: '#333',
                            lineHeight: '1.4',
                            flex: 1,
                            marginRight: '12px'
                          }}>
                            {currentMoment.title}
                          </div>
                          
                          <div style={{ 
                            fontSize: '16px', 
                            color: '#666',
                            background: 'rgba(40, 167, 69, 0.1)',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatTime(currentMoment.created_at)}
                          </div>
                        </div>

                        {currentMoment.content && (
                          <div className="moment-content" style={{
                            fontSize: '16px',
                            color: '#555',
                            lineHeight: '1.6',
                            marginBottom: '16px'
                          }}>
                            {currentMoment.content}
                          </div>
                        )}

                        {currentMoment.image_url && (
                          <div className="moment-image" style={{
                            marginBottom: '16px',
                            textAlign: 'center',
                            padding: '8px 0'
                          }}>
                            <img 
                              src={currentMoment.image_url} 
                              alt="朋友圈图片"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '400px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                objectFit: 'contain',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                              onClick={(e) => {
                                // 简单的图片预览功能
                                window.open(currentMoment.image_url, '_blank');
                              }}
                              title="点击查看大图"
                            />
                          </div>
                        )}

                        {currentMoment.mentioned_users.length > 0 && (
                          <div className="mentions" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '10px',
                            fontSize: '12px',
                            color: '#666'
                          }}>
                            <span>@</span>
                            {currentMoment.mentioned_users.map((user, index) => (
                              <span key={user.id}>
                                {user?.name || '未知用户'}
                                {index < currentMoment.mentioned_users.length - 1 && '、'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PagePasswordGuard>
  );
}

export default LiveRankingPage; 