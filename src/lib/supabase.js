import { createClient } from '@supabase/supabase-js'

// 环境变量验证
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// 开发环境配置检查
if (process.env.NODE_ENV === 'development') {
  if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
    console.warn('⚠️  请在 .env 文件中配置 REACT_APP_SUPABASE_URL')
  }
  if (!supabaseKey || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('⚠️  请在 .env 文件中配置 REACT_APP_SUPABASE_ANON_KEY')
  }
}

// 创建 Supabase 客户端，优化配置
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'team-manager@1.0.0'
    }
  }
})

// 十二使徒列表
export const ROLE_TYPES = [
  '彼得',
  '安德烈', 
  '雅各（西庇太）',
  '约翰',
  '腓力',
  '巴多罗买',
  '马太',
  '多马',
  '雅各（亚勒腓）',
  '西门（奋锐党）',
  '达太',
  '加略人犹大'
]

// 属性类型
export const ATTRIBUTES = {
  COURAGE: '勇气',
  FAITH: '信心',
  WISDOM: '智力'
}

// 工具函数：处理 Supabase 错误
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  
  // 常见错误的用户友好提示
  if (error.message?.includes('Invalid API key')) {
    return '配置错误，请检查 Supabase 设置'
  }
  if (error.message?.includes('Network')) {
    return '网络连接失败，请检查网络设置'
  }
  if (error.message?.includes('duplicate key')) {
    return '数据已存在，请检查是否重复'
  }
  
  return error.message || '操作失败，请稍后重试'
}

// 连接测试函数
export const testConnection = async () => {
  try {
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) throw error
    return { success: true, message: 'Supabase 连接正常' }
  } catch (error) {
    return { success: false, message: handleSupabaseError(error) }
  }
} 