import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Camera, 
  Send, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  AtSign,
  X,
  Image as ImageIcon,
  MessageCircle,
  Clock
} from 'lucide-react';
import PagePasswordGuard from '../components/PagePasswordGuard';

function MomentsPageSimple() {
  const [moments, setMoments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 发布动态表单状态
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: null,
    imagePreview: '',
    mentionedUsers: []
  });
  
  // @用户相关状态
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMomentsByDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    try {
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: '获取数据失败：' + error.message });
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, disciple, gender')
      .order('name');
    
    if (error) throw error;
    setUsers(data || []);
  };

  const fetchMomentsByDate = async () => {
    try {
      setLoading(true);
      // 计算12小时前的时间
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // 自动删除超过12小时的动态
      await supabase
        .from('moments')
        .delete()
        .lt('created_at', twelveHoursAgo.toISOString());

      // 查询12小时内的动态
      const { data: momentsData, error } = await supabase
        .from('moments')
        .select(`
          id,
          user_id,
          title,
          content,
          image_url,
          created_at,
          updated_at,
          users(name, disciple, gender)
        `)
        .gte('created_at', twelveHoursAgo.toISOString())
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
            moment_id: moment.id,
            user_id: moment.user_id,
            user_name: moment.users?.name || '匿名用户',
            user_disciple: moment.users?.disciple || '未知',
            user_gender: moment.users?.gender || '未知',
            title: moment.title,
            content: moment.content,
            image_url: moment.image_url,
            created_at: moment.created_at,
            updated_at: moment.updated_at,
            mentioned_users: mentions ? mentions.map(m => m.users) : []
          };
        })
      );

      setMoments(momentsWithMentions);
    } catch (error) {
      setMessage({ type: 'error', text: '获取朋友圈数据失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 图片压缩函数
  const compressImage = (file, maxWidth = 1400, maxHeight = 1400, quality = 0.85) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 计算新的尺寸，保持宽高比
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // 设置canvas尺寸
        canvas.width = width;
        canvas.height = height;
        
        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为Blob，使用指定的质量进行压缩
        canvas.toBlob((blob) => {
          // 创建新的File对象
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg', // 统一转换为JPEG格式以获得更好的压缩
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择图片文件' });
      return;
    }

    try {
      setMessage({ type: 'info', text: '正在压缩图片...' });
      
      // 压缩图片
      const compressedFile = await compressImage(file);
      
      // 显示压缩效果
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
      
      setMessage({ 
        type: 'success', 
        text: `图片压缩完成！原始：${originalSize}MB → 压缩后：${compressedSize}MB (节省${compressionRatio}%)` 
      });

      // 创建预览URL
      const previewUrl = URL.createObjectURL(compressedFile);
      setFormData(prev => ({
        ...prev,
        image: compressedFile,
        imagePreview: previewUrl
      }));
      
    } catch (error) {
      console.error('图片压缩失败:', error);
      setMessage({ type: 'error', text: '图片压缩失败，请重试' });
    }
  };

  const removeImage = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: ''
    }));
  };

  const handleMentionUser = (user) => {
    if (!formData.mentionedUsers.find(u => u.id === user.id)) {
      setFormData(prev => ({
        ...prev,
        mentionedUsers: [...prev.mentionedUsers, user]
      }));
    }
    setShowMentionDropdown(false);
    setMentionFilter('');
  };

  const removeMentionedUser = (userId) => {
    setFormData(prev => ({
      ...prev,
      mentionedUsers: prev.mentionedUsers.filter(u => u.id !== userId)
    }));
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `moments/${fileName}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: '请输入标题' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: '', text: '' });

      let imageUrl = null;
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }

      // 使用简化的create_moment函数
      const mentionedUserIds = formData.mentionedUsers.map(u => u.id);


      const { error } = await supabase
        .rpc('create_moment', {
          moment_title: formData.title.trim(),
          moment_content: formData.content.trim() || null,
          moment_image_url: imageUrl,
          mentioned_user_ids: mentionedUserIds
        });

      if (error) throw error;

      setMessage({ type: 'success', text: '朋友圈动态发布成功！' });
      
      // 重置表单
      setFormData({
        title: '',
        content: '',
        image: null,
        imagePreview: '',
        mentionedUsers: []
      });
      setShowCreateForm(false);
      
      // 刷新数据
      fetchMomentsByDate();

    } catch (error) {
      setMessage({ type: 'error', text: '发布失败：' + error.message });
    } finally {
      setUploading(false);
    }
  };

  // 删除动态
  const handleDeleteMoment = async (momentId) => {
    if (!window.confirm('确定要删除这条动态吗？')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('moments')
        .delete()
        .eq('id', momentId);
      if (error) throw error;
      setMessage({ type: 'success', text: '动态已删除' });
      fetchMomentsByDate();
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    user.disciple.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PagePasswordGuard pageKey="post" pagePassword="post">
      <div className="page-container">
        <div className="navigation">
          <Link to="/" className="nav-button">
            <ArrowLeft size={20} />
            返回首页
          </Link>
        </div>

        <div className="page-content moments-page">
          <div className="header">
            <h1>
              <MessageCircle size={32} />
              朋友圈
            </h1>
            <p>分享你的精彩时刻</p>
          </div>

          {message.text && (
            <div className={`${message.type === 'error' ? 'error-message' : 'success-message'}`}>
              {message.text}
            </div>
          )}

          {/* 发布按钮 */}
          <div className="create-moment-section">
            {!showCreateForm ? (
              <button 
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary create-moment-btn"
              >
                <Camera size={20} />
                分享动态
              </button>
            ) : (
              <div className="create-moment-form">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">标题 *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="form-input"
                      placeholder="分享你的精彩时刻..."
                      disabled={uploading}
                      maxLength={200}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">内容</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="form-input"
                      placeholder="详细描述..."
                      rows="3"
                      disabled={uploading}
                    />
                  </div>

                  {/* 图片上传 */}
                  <div className="form-group">
                    <label className="form-label">图片</label>
                    {!formData.imagePreview ? (
                      <div className="image-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          style={{ display: 'none' }}
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="image-upload-btn">
                          <ImageIcon size={24} />
                          <span>选择图片</span>
                        </label>
                      </div>
                    ) : (
                      <div className="image-preview">
                        <img src={formData.imagePreview} alt="预览" />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="remove-image-btn"
                          disabled={uploading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* @用户功能 */}
                  <div className="form-group">
                    <label className="form-label">@朋友</label>
                    <div className="mention-section">
                      <button
                        type="button"
                        onClick={() => setShowMentionDropdown(!showMentionDropdown)}
                        className="mention-btn"
                        disabled={uploading}
                      >
                        <AtSign size={20} />
                        添加@用户
                      </button>

                      {showMentionDropdown && (
                        <div className="mention-dropdown">
                          <input
                            type="text"
                            placeholder="搜索用户..."
                            value={mentionFilter}
                            onChange={(e) => setMentionFilter(e.target.value)}
                            className="mention-search"
                          />
                          <div className="mention-list">
                            {filteredUsers.map(user => (
                              <div
                                key={user.id}
                                onClick={() => handleMentionUser(user)}
                                className="mention-item"
                              >
                                <span>{user.name}</span>
                                <span className="mention-detail">{user.disciple}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {formData.mentionedUsers.length > 0 && (
                      <div className="mentioned-users">
                        {formData.mentionedUsers.map(user => (
                          <div key={user.id} className="mentioned-user">
                            <span>@{user.name}</span>
                            <button
                              type="button"
                              onClick={() => removeMentionedUser(user.id)}
                              disabled={uploading}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={uploading || !formData.title.trim()}
                    >
                      {uploading ? (
                        <div className="loading">
                          <div className="spinner"></div>
                          发布中...
                        </div>
                      ) : (
                        <>
                          <Send size={20} />
                          发布
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setFormData({
                          title: '',
                          content: '',
                          image: null,
                          imagePreview: '',
                          mentionedUsers: []
                        });
                      }}
                      className="btn btn-secondary"
                      disabled={uploading}
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* 朋友圈动态列表 */}
          <div className="moments-list">
            {loading ? (
              <div className="text-center">
                <div className="loading">
                  <div className="spinner"></div>
                  正在加载朋友圈...
                </div>
              </div>
            ) : moments.length === 0 ? (
              <div className="no-moments">
                <MessageCircle size={48} style={{ opacity: 0.3 }} />
                <p>今天还没有动态哦</p>
                <p>快来分享你的精彩时刻吧！</p>
              </div>
            ) : (
              moments.map(moment => (
                <div key={moment.moment_id} className="moment-card">
                  <div className="moment-header">
                    <div className="moment-time">
                      <Clock size={14} />
                      <span>{formatTime(moment.created_at)}</span>
                    </div>
                  </div>

                  <div className="moment-content">
                    <h3 className="moment-title">{moment.title}</h3>
                    
                    {moment.content && (
                      <p className="moment-text">{moment.content}</p>
                    )}

                    {moment.image_url && (
                      <div className="moment-image">
                        <img src={moment.image_url} alt={moment.title} />
                      </div>
                    )}

                    {moment.mentioned_users && moment.mentioned_users.length > 0 && (
                      <div className="moment-mentions">
                        <AtSign size={14} />
                        <span>
                          {moment.mentioned_users.map(user => user.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PagePasswordGuard>
  );
}

export default MomentsPageSimple; 