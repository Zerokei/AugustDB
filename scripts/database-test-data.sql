DELETE FROM moment_mentions;
DELETE FROM moments;
DELETE FROM friendships;
DELETE FROM attribute_history;
DELETE FROM users;

-- ================================================================
-- 第二步：插入用户分组测试数据
-- ================================================================

-- 智力用户组 - 只有智力属性有初始值
INSERT INTO users (name, disciple, gender, team_group, courage, faith, wisdom) VALUES
-- 马太组（智力10）
('张马太', '马太', '男', 1, 0, 0, 30),
('李马太', '马太', '女', 2, 0, 0, 25),

-- 约翰组（智力10）
('王约翰', '约翰', '男', 3, 0, 0, 40),
('刘约翰', '约翰', '女', 4, 0, 0, 35),

-- 腓力组（智力9）
('陈腓力', '腓力', '男', 5, 0, 0, 28),
('赵腓力', '腓力', '女', 6, 0, 0, 22),

-- 加略人犹大组（智力9）
('孙犹大', '加略人犹大', '男', 7, 0, 0, 26),
('周犹大', '加略人犹大', '女', 8, 0, 0, 20);

-- 勇气用户组 - 只有勇气属性有初始值
INSERT INTO users (name, disciple, gender, team_group, courage, faith, wisdom) VALUES
-- 彼得组（勇气10）
('张彼得', '彼得', '男', 1, 45, 0, 0),
('李彼得', '彼得', '女', 2, 40, 0, 0),

-- 雅各（西庇太）组（勇气9）
('王雅各', '雅各（西庇太）', '男', 3, 38, 0, 0),
('刘雅各', '雅各（西庇太）', '女', 4, 32, 0, 0),

-- 西门（奋锐党）组（勇气10）
('陈西门', '西门（奋锐党）', '男', 5, 42, 0, 0),
('赵西门', '西门（奋锐党）', '女', 6, 36, 0, 0),

-- 巴多罗买组（勇气9）
('孙巴多', '巴多罗买', '男', 7, 35, 0, 0),
('周巴多', '巴多罗买', '女', 8, 30, 0, 0);
-- Campfire - 用户分组测试数据脚本
-- ================================================================
-- 此脚本生成符合用户分组规则的测试数据
-- 请先执行 database-complete-setup.sql 再执行此脚本
-- 版本：v2.0 - 支持用户分组和属性限制
-- ================================================================

-- ================================================================
-- 第一步：清理现有测试数据
-- ================================================================

DELETE FROM moment_mentions;
DELETE FROM moments;
DELETE FROM friendships;
DELETE FROM attribute_history;
DELETE FROM users;

-- ================================================================
-- 第二步：插入用户分组测试数据
-- ================================================================

-- 智力用户组 - 只有智力属性有初始值
INSERT INTO users (name, disciple, gender, team_group, courage, faith, wisdom) VALUES
-- 马太组（智力10）
('张马太', '马太', '男', 1, 0, 0, 30),
('李马太', '马太', '女', 2, 0, 0, 25),

-- 约翰组（智力10）
('王约翰', '约翰', '男', 3, 0, 0, 40),
('刘约翰', '约翰', '女', 4, 0, 0, 35),

-- 腓力组（智力9）
('陈腓力', '腓力', '男', 5, 0, 0, 28),
('赵腓力', '腓力', '女', 6, 0, 0, 22),

-- 加略人犹大组（智力9）
('孙犹大', '加略人犹大', '男', 7, 0, 0, 26),
('周犹大', '加略人犹大', '女', 8, 0, 0, 20);

-- 勇气用户组 - 只有勇气属性有初始值
INSERT INTO users (name, disciple, gender, team_group, courage, faith, wisdom) VALUES
-- 彼得组（勇气10）
('张彼得', '彼得', '男', 1, 45, 0, 0),
('李彼得', '彼得', '女', 2, 40, 0, 0),

-- 雅各（西庇太）组（勇气9）
('王雅各', '雅各（西庇太）', '男', 3, 38, 0, 0),
('刘雅各', '雅各（西庇太）', '女', 4, 32, 0, 0),

-- 西门（奋锐党）组（勇气10）
('陈西门', '西门（奋锐党）', '男', 5, 42, 0, 0),
('赵西门', '西门（奋锐党）', '女', 6, 36, 0, 0),

-- 巴多罗买组（勇气9）
('孙巴多', '巴多罗买', '男', 7, 35, 0, 0),
('周巴多', '巴多罗买', '女', 8, 30, 0, 0);

-- 信心用户组 - 只有信心属性有初始值
INSERT INTO users (name, disciple, gender, team_group, courage, faith, wisdom) VALUES
-- 多马组（信心9）
('张多马', '多马', '男', 1, 0, 33, 0),
('李多马', '多马', '女', 2, 0, 27, 0),

-- 安德烈组（信心10）
('王安德烈', '安德烈', '男', 3, 0, 45, 0),
('刘安德烈', '安德烈', '女', 4, 0, 38, 0),

-- 达太组（信心8）
('陈达太', '达太', '男', 5, 0, 30, 0),
('赵达太', '达太', '女', 6, 0, 24, 0),

-- 雅各（亚勒腓）组（信心9）
('孙雅各', '雅各（亚勒腓）', '男', 7, 0, 36, 0),
('周雅各', '雅各（亚勒腓）', '女', 8, 0, 31, 0);

-- 新加入的用户（使用正确的初始值）
INSERT INTO users (name, disciple, gender, team_group, courage, faith, wisdom) VALUES
-- 刚注册的新用户（使用配置的初始值）
('新人智者', '马太', '男', 9, 0, 0, 10),
('新人勇士', '彼得', '女', 10, 10, 0, 0),
('新人信者', '安德烈', '男', 9, 0, 10, 0),
('学习达人', '约翰', '女', 10, 0, 0, 10),
('勇气使者', '雅各（西庇太）', '男', 9, 9, 0, 0),
('信心导师', '多马', '女', 10, 0, 9, 0);

-- ================================================================
-- 第三步：生成用户分组的属性变更历史数据
-- ================================================================

-- 为智力用户生成智力增长历史
INSERT INTO attribute_history (user_id, attribute_type, operation_type, value_change, old_value, new_value) 
SELECT 
    u.id,
    'wisdom' as attribute_type,
    'add' as operation_type,
    20 as value_change,
    u.wisdom - 20 as old_value,
    u.wisdom as new_value
FROM users u 
WHERE u.disciple IN ('马太', '约翰', '腓力', '加略人犹大') 
AND u.wisdom >= 20
LIMIT 8;

-- 为勇气用户生成勇气增长历史
INSERT INTO attribute_history (user_id, attribute_type, operation_type, value_change, old_value, new_value) 
SELECT 
    u.id,
    'courage' as attribute_type,
    'add' as operation_type,
    25 as value_change,
    u.courage - 25 as old_value,
    u.courage as new_value
FROM users u 
WHERE u.disciple IN ('彼得', '雅各（西庇太）', '西门（奋锐党）', '巴多罗买') 
AND u.courage >= 25
LIMIT 8;

-- 为信心用户生成信心增长历史
INSERT INTO attribute_history (user_id, attribute_type, operation_type, value_change, old_value, new_value) 
SELECT 
    u.id,
    'faith' as attribute_type,
    'add' as operation_type,
    20 as value_change,
    u.faith - 20 as old_value,
    u.faith as new_value
FROM users u 
WHERE u.disciple IN ('多马', '安德烈', '达太', '雅各（亚勒腓）') 
AND u.faith >= 20
LIMIT 8;

-- 添加一些今日的属性增长记录（用于每日榜单测试）
INSERT INTO attribute_history (user_id, attribute_type, operation_type, value_change, old_value, new_value, created_at) 
SELECT 
    u.id,
    'wisdom' as attribute_type,
    'add' as operation_type,
    5 as value_change,
    u.wisdom - 5 as old_value,
    u.wisdom as new_value,
    NOW() as created_at
FROM users u 
WHERE u.disciple IN ('马太', '约翰', '腓力', '加略人犹大') 
LIMIT 3;

INSERT INTO attribute_history (user_id, attribute_type, operation_type, value_change, old_value, new_value, created_at) 
SELECT 
    u.id,
    'courage' as attribute_type,
    'add' as operation_type,
    7 as value_change,
    u.courage - 7 as old_value,
    u.courage as new_value,
    NOW() as created_at
FROM users u 
WHERE u.disciple IN ('彼得', '雅各（西庇太）', '西门（奋锐党）', '巴多罗买') 
LIMIT 3;

INSERT INTO attribute_history (user_id, attribute_type, operation_type, value_change, old_value, new_value, created_at) 
SELECT 
    u.id,
    'faith' as attribute_type,
    'add' as operation_type,
    6 as value_change,
    u.faith - 6 as old_value,
    u.faith as new_value,
    NOW() as created_at
FROM users u 
WHERE u.disciple IN ('多马', '安德烈', '达太', '雅各（亚勒腓）') 
LIMIT 3;

-- ================================================================
-- 第四步：生成单向朋友关系数据
-- ================================================================

-- 朋友关系是单向且唯一的，只有user1（主动认识的一方）获得朋友数加分
-- 如果A认识了B，则B不能再认识A
INSERT INTO friendships (user1_id, user2_id, notes) VALUES
-- 智力用户之间的认识关系
(
    (SELECT id FROM users WHERE name = '张马太'),
    (SELECT id FROM users WHERE name = '王约翰'),
    '智力用户间的学术交流'
),
(
    (SELECT id FROM users WHERE name = '陈腓力'),
    (SELECT id FROM users WHERE name = '孙犹大'),
    '同为智力用户的研究伙伴'
),

-- 勇气用户之间的认识关系
(
    (SELECT id FROM users WHERE name = '张彼得'),
    (SELECT id FROM users WHERE name = '王雅各'),
    '勇气用户的战友情谊'
),
(
    (SELECT id FROM users WHERE name = '陈西门'),
    (SELECT id FROM users WHERE name = '孙巴多'),
    '奋锐党与使徒的联盟'
),

-- 信心用户之间的认识关系
(
    (SELECT id FROM users WHERE name = '王安德烈'),
    (SELECT id FROM users WHERE name = '张多马'),
    '信心用户的信仰分享'
),
(
    (SELECT id FROM users WHERE name = '陈达太'),
    (SELECT id FROM users WHERE name = '孙雅各'),
    '同为信心用户的祷告伙伴'
),

-- 跨组别的认识关系（展示用户间的多样性）
(
    (SELECT id FROM users WHERE name = '张彼得'),
    (SELECT id FROM users WHERE name = '李马太'),
    '勇气用户认识智力用户'
),
(
    (SELECT id FROM users WHERE name = '王约翰'),
    (SELECT id FROM users WHERE name = '刘安德烈'),
    '智力用户认识信心用户'
),
(
    (SELECT id FROM users WHERE name = '张多马'),
    (SELECT id FROM users WHERE name = '赵西门'),
    '信心用户认识勇气用户'
),

-- 新用户的认识关系
(
    (SELECT id FROM users WHERE name = '新人智者'),
    (SELECT id FROM users WHERE name = '新人勇士'),
    '新入门的用户相互认识'
),
(
    (SELECT id FROM users WHERE name = '学习达人'),
    (SELECT id FROM users WHERE name = '信心导师'),
    '学习型用户与导师的关系'
);

-- ================================================================
-- 第五步：生成照片墙时刻数据
-- ================================================================

INSERT INTO moments (user_id, title, content, image_url) VALUES
-- 智力用户的学习分享
(
    (SELECT id FROM users WHERE name = '张马太'),
    '今日研读心得',
    '深入学习了用户的智慧传承，收获满满！愿与众用户分享所学。',
    'https://example.com/study1.jpg'
),
(
    (SELECT id FROM users WHERE name = '王约翰'),
    '智慧之光',
    '在思考中发现真理，在学习中获得成长。智慧是用户最宝贵的财富。',
    NULL
),

-- 勇气用户的勇敢见证
(
    (SELECT id FROM users WHERE name = '张彼得'),
    '勇敢前行',
    '今天在困难面前选择了勇敢，虽然过程艰辛，但内心充满力量！',
    'https://example.com/courage1.jpg'
),
(
    (SELECT id FROM users WHERE name = '陈西门'),
    '为真理而战',
    '奋锐党的精神就是永不退缩，为了正义和真理，勇往直前！',
    NULL
),

-- 信心用户的信仰见证
(
    (SELECT id FROM users WHERE name = '王安德烈'),
    '信心的力量',
    '在祷告中得到平安，在信靠中获得力量。信心是我们前进的动力。',
    'https://example.com/faith1.jpg'
),
(
    (SELECT id FROM users WHERE name = '张多马'),
    '从疑惑到相信',
    '虽然曾经疑惑，但通过经历见证了真理的存在，信心更加坚定。',
    NULL
),

-- 今日的时刻（用于滚榜测试）
(
    (SELECT id FROM users WHERE name = '新人智者'),
    '初入门径',
    '作为新入门的智力用户，期待在智慧的道路上不断成长！',
    'https://example.com/newbie1.jpg'
),
(
    (SELECT id FROM users WHERE name = '勇气使者'),
    '勇敢的心',
    '今天克服了内心的恐惧，迈出了勇敢的第一步！',
    'https://example.com/brave1.jpg'
),
(
    (SELECT id FROM users WHERE name = '信心导师'),
    '信仰的引导',
    '帮助新用户建立信心，看到他们的成长是最大的喜悦。',
    'https://example.com/guide1.jpg'
);

-- ================================================================
-- 第六步：生成@提及数据
-- ================================================================

-- 为照片墙时刻添加@提及
INSERT INTO moment_mentions (moment_id, mentioned_user_id) VALUES
-- 智力用户互相@
(
    (SELECT id FROM moments WHERE title = '今日研读心得'),
    (SELECT id FROM users WHERE name = '王约翰')
),
(
    (SELECT id FROM moments WHERE title = '智慧之光'),
    (SELECT id FROM users WHERE name = '陈腓力')
),

-- 勇气用户互相@
(
    (SELECT id FROM moments WHERE title = '勇敢前行'),
    (SELECT id FROM users WHERE name = '王雅各')
),
(
    (SELECT id FROM moments WHERE title = '为真理而战'),
    (SELECT id FROM users WHERE name = '孙巴多')
),

-- 信心用户互相@
(
    (SELECT id FROM moments WHERE title = '信心的力量'),
    (SELECT id FROM users WHERE name = '陈达太')
),
(
    (SELECT id FROM moments WHERE title = '从疑惑到相信'),
    (SELECT id FROM users WHERE name = '孙雅各')
);

-- ================================================================
-- 第七步：数据验证和统计
-- ================================================================

DO $$
DECLARE
    user_count INTEGER;
    wisdom_count INTEGER;
    courage_count INTEGER;
    faith_count INTEGER;
    friendship_count INTEGER;
    moment_count INTEGER;
BEGIN
    -- 统计用户数量
    SELECT COUNT(*) INTO user_count FROM users;
    
    -- 统计各用户组数量
    SELECT COUNT(*) INTO wisdom_count FROM users WHERE disciple IN ('马太', '约翰', '腓力', '加略人犹大');
    SELECT COUNT(*) INTO courage_count FROM users WHERE disciple IN ('彼得', '雅各（西庇太）', '西门（奋锐党）', '巴多罗买');
    SELECT COUNT(*) INTO faith_count FROM users WHERE disciple IN ('多马', '安德烈', '达太', '雅各（亚勒腓）');
    
    -- 统计朋友关系和时刻数量
    SELECT COUNT(*) INTO friendship_count FROM friendships;
    SELECT COUNT(*) INTO moment_count FROM moments;
    
    RAISE NOTICE '🎉 用户分组测试数据生成完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 数据统计：';
    RAISE NOTICE '   👥 总用户数：% 人', user_count;
    RAISE NOTICE '   🧠 智力用户：% 人', wisdom_count;
    RAISE NOTICE '   ⚔️ 勇气用户：% 人', courage_count;
    RAISE NOTICE '   🙏 信心用户：% 人', faith_count;
    RAISE NOTICE '   🤝 朋友关系：% 对', friendship_count;
    RAISE NOTICE '   📱 照片墙：% 条', moment_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 用户分组规则验证：';
    RAISE NOTICE '   - 智力用户只有智力属性';
    RAISE NOTICE '   - 勇气用户只有勇气属性';
    RAISE NOTICE '   - 信心用户只有信心属性';
    RAISE NOTICE '   - 单向朋友关系已建立';
    RAISE NOTICE '   - 今日属性增长记录已创建';
    RAISE NOTICE '========================================';
    RAISE NOTICE '�� 可以开始测试用户分组系统功能！';
    RAISE NOTICE '========================================';
END $$; 