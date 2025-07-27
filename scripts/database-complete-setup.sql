-- ================================================================
-- Campfire - 完整数据库部署脚本
-- ================================================================
-- 此脚本一次性创建完整的用户分组系统
-- 包含：数据库表结构、函数、存储桶设置、安全策略、组别管理
-- 请在 Supabase SQL 编辑器中执行此脚本
-- 版本：v3.0 - 支持用户分组、属性限制和组别管理
-- ================================================================

-- ================================================================
-- 第一步：清理现有数据库结构
-- ================================================================

-- 删除现有表（CASCADE 会自动删除所有依赖）
DROP TABLE IF EXISTS moment_mentions CASCADE;
DROP TABLE IF EXISTS moments CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS attribute_history CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DO $$
DECLARE
  drop_stmt text;
BEGIN
  FOR drop_stmt IN
    SELECT 
      'DROP FUNCTION IF EXISTS "' || n.nspname || '"."' || p.proname || '"(' ||
      pg_get_function_identity_arguments(p.oid) || ') CASCADE;'
    FROM 
      pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE 
      n.nspname = 'public'
      AND p.prokind = 'f'  -- 函数（非过程或聚合）
  LOOP
    RAISE NOTICE 'Executing: %', drop_stmt;
    EXECUTE drop_stmt;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 第二步：创建基础函数
-- ================================================================

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 第三步：创建主要数据表
-- ================================================================

-- 创建用户用户表
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    disciple VARCHAR(50) NOT NULL CHECK (disciple IN (
        '彼得', '安德烈', '雅各（西庇太）', '约翰', '腓力', 
        '巴多罗买', '马太', '多马', '雅各（亚勒腓）', 
        '西门（奋锐党）', '达太', '加略人犹大'
    )),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('男', '女')),
    team_group INTEGER NOT NULL CHECK (team_group >= 1 AND team_group <= 10),
    courage INTEGER DEFAULT 0 CHECK (courage >= 0),
    faith INTEGER DEFAULT 0 CHECK (faith >= 0),
    wisdom INTEGER DEFAULT 0 CHECK (wisdom >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 用户分组约束：确保属性分配符合用户专长
    CONSTRAINT validate_disciple_attributes CHECK (
        -- 智力用户组：马太、约翰、腓力、加略人犹大
        (disciple IN ('马太', '约翰', '腓力', '加略人犹大') AND courage = 0 AND faith = 0) OR
        -- 勇气用户组：彼得、雅各（西庇太）、西门（奋锐党）、巴多罗买  
        (disciple IN ('彼得', '雅各（西庇太）', '西门（奋锐党）', '巴多罗买') AND faith = 0 AND wisdom = 0) OR
        -- 信心用户组：多马、安德烈、达太、雅各（亚勒腓）
        (disciple IN ('多马', '安德烈', '达太', '雅各（亚勒腓）') AND courage = 0 AND wisdom = 0)
    )
);

-- 创建自动更新时间戳触发器
CREATE TRIGGER trigger_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建用户索引
CREATE INDEX idx_users_disciple ON users(disciple);
CREATE INDEX idx_users_team_group ON users(team_group);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ================================================================
-- 第四步：创建属性历史表
-- ================================================================

CREATE TABLE attribute_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attribute_type VARCHAR(20) NOT NULL CHECK (attribute_type IN ('courage', 'faith', 'wisdom')),
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('add', 'subtract', 'reset')),
    value_change INTEGER NOT NULL,
    old_value INTEGER NOT NULL CHECK (old_value >= 0),
    new_value INTEGER NOT NULL CHECK (new_value >= 0),
    notes TEXT,
    is_undone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建历史记录触发器
CREATE TRIGGER trigger_attribute_history_updated_at 
    BEFORE UPDATE ON attribute_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建属性历史索引
CREATE INDEX idx_attribute_history_user_id ON attribute_history(user_id);
CREATE INDEX idx_attribute_history_type ON attribute_history(attribute_type);
CREATE INDEX idx_attribute_history_created_at ON attribute_history(created_at);
CREATE INDEX idx_attribute_history_user_date ON attribute_history(user_id, created_at);

-- ================================================================
-- 第五步：创建单向朋友关系表
-- ================================================================

CREATE TABLE friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保不能自己认识自己
    CONSTRAINT no_self_friendship CHECK (user1_id != user2_id),
    -- 确保单向且唯一的认识关系
    CONSTRAINT unique_directional_friendship UNIQUE (user1_id, user2_id)
);

-- 创建朋友关系触发器
CREATE TRIGGER trigger_friendships_updated_at 
    BEFORE UPDATE ON friendships 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建朋友关系索引
CREATE INDEX idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX idx_friendships_created_at ON friendships(created_at);

-- ================================================================
-- 第六步：创建朋友圈时刻表
-- ================================================================

CREATE TABLE moments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    image_url TEXT,
    image_path TEXT,
    image_size BIGINT,
    image_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建时刻触发器
CREATE TRIGGER trigger_moments_updated_at 
    BEFORE UPDATE ON moments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建时刻索引
CREATE INDEX idx_moments_user_id ON moments(user_id);
CREATE INDEX idx_moments_created_at ON moments(created_at);
-- CREATE INDEX idx_moments_date ON moments(DATE(created_at));
CREATE INDEX idx_moments_image_path ON moments(image_path);

-- ================================================================
-- 第七步：创建时刻提及表
-- ================================================================

CREATE TABLE moment_mentions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 确保同一时刻不能重复提及同一用户
    CONSTRAINT unique_moment_mention UNIQUE (moment_id, mentioned_user_id)
);

-- 创建提及索引
CREATE INDEX idx_moment_mentions_moment ON moment_mentions(moment_id);
CREATE INDEX idx_moment_mentions_user ON moment_mentions(mentioned_user_id);

-- ================================================================
-- 第八步：创建用户分组相关函数
-- ================================================================

-- 获取用户组别函数
CREATE OR REPLACE FUNCTION get_disciple_group(disciple_name VARCHAR(50))
RETURNS VARCHAR(20) AS $$
BEGIN
    CASE 
        WHEN disciple_name IN ('马太', '约翰', '腓力', '加略人犹大') THEN
            RETURN 'wisdom';
        WHEN disciple_name IN ('彼得', '雅各（西庇太）', '西门（奋锐党）', '巴多罗买') THEN
            RETURN 'courage';
        WHEN disciple_name IN ('多马', '安德烈', '达太', '雅各（亚勒腓）') THEN
            RETURN 'faith';
        ELSE
            RETURN 'unknown';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 获取用户初始属性值函数
CREATE OR REPLACE FUNCTION get_disciple_initial_values(disciple_name VARCHAR(50))
RETURNS TABLE(courage INTEGER, faith INTEGER, wisdom INTEGER) AS $$
BEGIN
    CASE disciple_name
        -- 智力用户组
        WHEN '马太' THEN RETURN QUERY SELECT 0, 0, 10;
        WHEN '约翰' THEN RETURN QUERY SELECT 0, 0, 10;
        WHEN '腓力' THEN RETURN QUERY SELECT 0, 0, 9;
        WHEN '加略人犹大' THEN RETURN QUERY SELECT 0, 0, 9;
        -- 勇气用户组
        WHEN '彼得' THEN RETURN QUERY SELECT 10, 0, 0;
        WHEN '雅各（西庇太）' THEN RETURN QUERY SELECT 9, 0, 0;
        WHEN '西门（奋锐党）' THEN RETURN QUERY SELECT 10, 0, 0;
        WHEN '巴多罗买' THEN RETURN QUERY SELECT 9, 0, 0;
        -- 信心用户组
        WHEN '多马' THEN RETURN QUERY SELECT 0, 9, 0;
        WHEN '安德烈' THEN RETURN QUERY SELECT 0, 10, 0;
        WHEN '达太' THEN RETURN QUERY SELECT 0, 8, 0;
        WHEN '雅各（亚勒腓）' THEN RETURN QUERY SELECT 0, 9, 0;
        ELSE
            RETURN QUERY SELECT 0, 0, 0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 第九步：创建属性记录函数
-- ================================================================

-- 记录属性变更的触发器函数
CREATE OR REPLACE FUNCTION record_attribute_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 记录勇气变更
    IF OLD.courage != NEW.courage THEN
        INSERT INTO attribute_history (
            user_id, attribute_type, operation_type, value_change, old_value, new_value
        ) VALUES (
            NEW.id,
            'courage',
            CASE WHEN NEW.courage > OLD.courage THEN 'add' ELSE 'subtract' END,
            ABS(NEW.courage - OLD.courage),
            OLD.courage,
            NEW.courage
        );
    END IF;
    
    -- 记录信心变更
    IF OLD.faith != NEW.faith THEN
        INSERT INTO attribute_history (
            user_id, attribute_type, operation_type, value_change, old_value, new_value
        ) VALUES (
            NEW.id,
            'faith',
            CASE WHEN NEW.faith > OLD.faith THEN 'add' ELSE 'subtract' END,
            ABS(NEW.faith - OLD.faith),
            OLD.faith,
            NEW.faith
        );
    END IF;
    
    -- 记录智力变更
    IF OLD.wisdom != NEW.wisdom THEN
        INSERT INTO attribute_history (
            user_id, attribute_type, operation_type, value_change, old_value, new_value
        ) VALUES (
            NEW.id,
            'wisdom',
            CASE WHEN NEW.wisdom > OLD.wisdom THEN 'add' ELSE 'subtract' END,
            ABS(NEW.wisdom - OLD.wisdom),
            OLD.wisdom,
            NEW.wisdom
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建属性变更记录触发器
CREATE TRIGGER trigger_record_attribute_change
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION record_attribute_change();

-- ================================================================
-- 第十步：创建单向朋友关系函数
-- ================================================================

-- 添加单向朋友关系函数
CREATE OR REPLACE FUNCTION add_friendship(
    user1_uuid UUID,
    user2_uuid UUID,
    friendship_notes TEXT DEFAULT ''
)
RETURNS TEXT AS $$
DECLARE
    user1_name VARCHAR(100);
    user2_name VARCHAR(100);
BEGIN
    -- 检查用户是否存在
    SELECT name INTO user1_name FROM users WHERE id = user1_uuid;
    SELECT name INTO user2_name FROM users WHERE id = user2_uuid;
    
    IF user1_name IS NULL THEN
        RAISE EXCEPTION '主动认识的用户不存在';
    END IF;
    
    IF user2_name IS NULL THEN
        RAISE EXCEPTION '被认识的用户不存在';
    END IF;
    
    -- 检查是否为同一人
    IF user1_uuid = user2_uuid THEN
        RAISE EXCEPTION '不能认识自己';
    END IF;
    
    -- 检查是否已经存在这个方向的朋友关系
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE user1_id = user1_uuid AND user2_id = user2_uuid
    ) THEN
        RAISE EXCEPTION '%已经认识了%', user1_name, user2_name;
    END IF;
    
    -- 检查是否已经存在反向的朋友关系
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE user1_id = user2_uuid AND user2_id = user1_uuid
    ) THEN
        RAISE EXCEPTION '%已经认识了%，不能建立反向关系', user2_name, user1_name;
    END IF;
    
    -- 插入新的朋友关系
    INSERT INTO friendships (user1_id, user2_id, notes)
    VALUES (user1_uuid, user2_uuid, friendship_notes);
    
    RETURN format('%s成功认识了%s！', user1_name, user2_name);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 第十一步：创建每日属性统计函数
-- ================================================================

-- 创建每日属性变更统计函数
CREATE OR REPLACE FUNCTION get_daily_attribute_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    user_id UUID,
    user_name VARCHAR(100),
    user_disciple VARCHAR(50),
    user_gender VARCHAR(10),
    disciple_group VARCHAR(20),
    courage_gain INTEGER,
    faith_gain INTEGER,
    wisdom_gain INTEGER,
    total_gain INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.name as user_name,
        u.disciple as user_disciple,
        u.gender as user_gender,
        get_disciple_group(u.disciple) as disciple_group,
        COALESCE(SUM(CASE 
            WHEN ah.attribute_type = 'courage' AND ah.operation_type = 'add' THEN ah.value_change
            WHEN ah.attribute_type = 'courage' AND ah.operation_type = 'subtract' THEN -ah.value_change
            ELSE 0 
        END), 0)::INTEGER as courage_gain,
        COALESCE(SUM(CASE 
            WHEN ah.attribute_type = 'faith' AND ah.operation_type = 'add' THEN ah.value_change
            WHEN ah.attribute_type = 'faith' AND ah.operation_type = 'subtract' THEN -ah.value_change
            ELSE 0 
        END), 0)::INTEGER as faith_gain,
        COALESCE(SUM(CASE 
            WHEN ah.attribute_type = 'wisdom' AND ah.operation_type = 'add' THEN ah.value_change
            WHEN ah.attribute_type = 'wisdom' AND ah.operation_type = 'subtract' THEN -ah.value_change
            ELSE 0 
        END), 0)::INTEGER as wisdom_gain,
        COALESCE(SUM(CASE 
            WHEN ah.operation_type = 'add' THEN ah.value_change
            WHEN ah.operation_type = 'subtract' THEN -ah.value_change
            ELSE 0 
        END), 0)::INTEGER as total_gain
    FROM users u
    LEFT JOIN attribute_history ah ON u.id = ah.user_id 
        AND DATE(ah.created_at) = target_date
        AND ah.is_undone = false
        AND ah.operation_type IN ('add', 'subtract')
    GROUP BY u.id, u.name, u.disciple, u.gender
    HAVING COALESCE(SUM(CASE 
        WHEN ah.operation_type = 'add' THEN ah.value_change
        WHEN ah.operation_type = 'subtract' THEN -ah.value_change
        ELSE 0 
    END), 0) > 0
    ORDER BY total_gain DESC, u.name;
END;
$$ LANGUAGE plpgsql;

-- 创建每日用户组别统计函数
CREATE OR REPLACE FUNCTION get_daily_group_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    disciple_group VARCHAR(20),
    group_name VARCHAR(10),
    active_disciples INTEGER,
    total_gain INTEGER,
    avg_gain NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        get_disciple_group(u.disciple) as disciple_group,
        CASE 
            WHEN get_disciple_group(u.disciple) = 'wisdom' THEN '智力用户'
            WHEN get_disciple_group(u.disciple) = 'courage' THEN '勇气用户'
            WHEN get_disciple_group(u.disciple) = 'faith' THEN '信心用户'
            ELSE '未知'
        END as group_name,
        COUNT(DISTINCT u.id)::INTEGER as active_disciples,
        COALESCE(SUM(CASE 
            WHEN ah.operation_type = 'add' THEN ah.value_change
            WHEN ah.operation_type = 'subtract' THEN -ah.value_change
            ELSE 0 
        END), 0)::INTEGER as total_gain,
        COALESCE(AVG(CASE 
            WHEN ah.operation_type = 'add' THEN ah.value_change
            WHEN ah.operation_type = 'subtract' THEN -ah.value_change
            ELSE 0 
        END), 0)::NUMERIC(10,2) as avg_gain
    FROM users u
    LEFT JOIN attribute_history ah ON u.id = ah.user_id 
        AND DATE(ah.created_at) = target_date
        AND ah.is_undone = false
        AND ah.operation_type IN ('add', 'subtract')
    WHERE EXISTS (
        SELECT 1 FROM attribute_history ah2 
        WHERE ah2.user_id = u.id 
        AND DATE(ah2.created_at) = target_date
        AND ah2.is_undone = false
        AND ah2.operation_type IN ('add', 'subtract')
    )
    GROUP BY get_disciple_group(u.disciple)
    ORDER BY total_gain DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 第十二步：创建其他实用函数
-- ================================================================

-- 获取用户朋友列表函数
CREATE OR REPLACE FUNCTION get_user_friends(target_user_id UUID)
RETURNS TABLE(
    friend_id UUID,
    friend_name VARCHAR(100),
    friend_disciple VARCHAR(50),
    friendship_date TIMESTAMP WITH TIME ZONE,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as friend_id,
        u.name as friend_name,
        u.disciple as friend_disciple,
        f.created_at as friendship_date,
        f.notes
    FROM friendships f
    JOIN users u ON f.user2_id = u.id
    WHERE f.user1_id = target_user_id
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 获取朋友关系统计函数
CREATE OR REPLACE FUNCTION get_friendship_stats()
RETURNS TABLE(
    total_friendships BIGINT,
    most_social_user VARCHAR(100),
    max_friends BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_friendships,
        (SELECT u.name 
         FROM users u 
         JOIN (
             SELECT user1_id, COUNT(*) as friend_count
             FROM friendships 
             GROUP BY user1_id 
             ORDER BY friend_count DESC 
             LIMIT 1
         ) top_user ON u.id = top_user.user1_id
        ) as most_social_user,
        (SELECT COUNT(*) 
         FROM friendships 
         GROUP BY user1_id 
         ORDER BY COUNT(*) DESC 
         LIMIT 1
        ) as max_friends
    FROM friendships;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 第十三步：创建存储桶和存储函数
-- ================================================================

-- 创建朋友圈图片存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('moments', 'moments', true)
ON CONFLICT (id) DO UPDATE SET 
    name = 'moments',
    public = true;

-- 创建用户头像存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET 
    name = 'avatars',
    public = true;

-- 创建用户组别标识图片存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('disciple-badges', 'disciple-badges', true)
ON CONFLICT (id) DO UPDATE SET 
    name = 'disciple-badges',
    public = true;

-- 删除已存在的存储策略
DROP POLICY IF EXISTS "Public can view moment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload moment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own moment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own moment images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view disciple badges" ON storage.objects;
DROP POLICY IF EXISTS "Admin can manage disciple badges" ON storage.objects;

-- 创建朋友圈图片存储策略
CREATE POLICY "Public can view moment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'moments');

CREATE POLICY "Users can upload moment images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'moments' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own moment images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'moments' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own moment images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'moments' AND
    auth.role() = 'authenticated'
);

-- 创建用户头像存储策略
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
);

-- 创建用户组别标识图片策略
CREATE POLICY "Public can view disciple badges"
ON storage.objects FOR SELECT
USING (bucket_id = 'disciple-badges');

CREATE POLICY "Admin can manage disciple badges"
ON storage.objects FOR ALL
USING (
    bucket_id = 'disciple-badges' AND
    auth.role() = 'service_role'
);

-- 创建存储辅助函数
CREATE OR REPLACE FUNCTION get_moment_image_url(file_path TEXT)
RETURNS TEXT AS $$
BEGIN
    IF file_path IS NULL OR file_path = '' THEN
        RETURN NULL;
    END IF;
    
    RETURN 'https://' || current_setting('app.settings.supabase_url', true) || 
           '/storage/v1/object/public/moments/' || file_path;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_avatar_url(file_path TEXT)
RETURNS TEXT AS $$
BEGIN
    IF file_path IS NULL OR file_path = '' THEN
        RETURN NULL;
    END IF;
    
    RETURN 'https://' || current_setting('app.settings.supabase_url', true) || 
           '/storage/v1/object/public/avatars/' || file_path;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_disciple_badge_url(disciple_name TEXT)
RETURNS TEXT AS $$
DECLARE
    badge_filename TEXT;
BEGIN
    CASE get_disciple_group(disciple_name)
        WHEN 'wisdom' THEN badge_filename := 'wisdom-badge.png';
        WHEN 'courage' THEN badge_filename := 'courage-badge.png';
        WHEN 'faith' THEN badge_filename := 'faith-badge.png';
        ELSE badge_filename := 'default-badge.png';
    END CASE;
    
    RETURN 'https://' || current_setting('app.settings.supabase_url', true) || 
           '/storage/v1/object/public/disciple-badges/' || badge_filename;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 第十四步：验证数据库部署
-- ================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    bucket_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- 检查表数量
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'attribute_history', 'friendships', 'moments', 'moment_mentions');
    
    -- 检查函数数量
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN (
        'update_updated_at_column', 'record_attribute_change', 'add_friendship',
        'get_user_friends', 'get_friendship_stats', 'get_daily_attribute_stats',
        'get_daily_group_stats', 'get_disciple_group', 'get_disciple_initial_values',
        'get_moment_image_url', 'get_avatar_url', 'get_disciple_badge_url'
    );
    
    -- 检查存储桶数量
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets 
    WHERE id IN ('moments', 'avatars', 'disciple-badges');
    
    -- 检查策略数量（尽力而为）
    BEGIN
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (policyname LIKE '%moment%' OR policyname LIKE '%avatar%' OR policyname LIKE '%badge%');
    EXCEPTION WHEN others THEN
        policy_count := 0;
    END;
    
    RAISE NOTICE '🎉 用户分组系统完整部署完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 部署统计：';
    RAISE NOTICE '   📋 数据表：%/5 个', table_count;
    RAISE NOTICE '   ⚙️ 函数：%/11 个', function_count;
    RAISE NOTICE '   🗂️ 存储桶：%/3 个', bucket_count;
    RAISE NOTICE '   🔒 存储策略：% 个', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 核心功能：';
    RAISE NOTICE '   🧠 智力用户：马太(10)、约翰(10)、腓力(9)、加略人犹大(9)';
    RAISE NOTICE '   ⚔️ 勇气用户：彼得(10)、雅各（西庇太）(9)、西门（奋锐党）(10)、巴多罗买(9)';
    RAISE NOTICE '   🙏 信心用户：多马(9)、安德烈(10)、达太(8)、雅各（亚勒腓）(9)';
    RAISE NOTICE '   🤝 单向朋友关系系统';
    RAISE NOTICE '   📱 朋友圈图片上传';
    RAISE NOTICE '   📊 每日属性统计';
    RAISE NOTICE '========================================';
    
    IF table_count = 5 AND function_count >= 10 AND bucket_count = 3 THEN
        RAISE NOTICE '🚀 系统部署成功！可以执行测试数据脚本了！';
    ELSE
        RAISE NOTICE '⚠️ 部分功能可能部署不完整，请检查错误信息';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '📝 下一步：执行 database-test-data.sql 插入测试数据';
    RAISE NOTICE '🎯 然后启动前端应用开始使用系统！';
    RAISE NOTICE '✨ 新功能：支持1-10组的组别管理功能';
    RAISE NOTICE '========================================';
END $$; 

-- ================================================================
-- 第十五步：创建朋友圈时刻函数
-- ================================================================

CREATE OR REPLACE FUNCTION create_moment(
  moment_title text,
  moment_content text,
  moment_image_url text,
  mentioned_user_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  new_moment_id uuid;
BEGIN
  -- 1. 插入 moment，并获取 id
  INSERT INTO moments (user_id, content, image_url, title)
  VALUES (NULL, moment_content, moment_image_url, moment_title)
  RETURNING id INTO new_moment_id;

  -- 2. 插入 @提及
  IF array_length(mentioned_user_ids, 1) > 0 THEN
    INSERT INTO moment_mentions (moment_id, mentioned_user_id)
    SELECT new_moment_id, unnest(mentioned_user_ids);
  END IF;
END;
$$;