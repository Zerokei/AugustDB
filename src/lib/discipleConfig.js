// 用户分组配置
export const DISCIPLE_GROUPS = {
  WISDOM: 'wisdom',
  COURAGE: 'courage', 
  FAITH: 'faith'
};

export const DISCIPLE_CONFIG = {
  // 智力用户组
  '马太': {
    group: DISCIPLE_GROUPS.WISDOM,
    primaryAttribute: 'wisdom',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '约翰': {
    group: DISCIPLE_GROUPS.WISDOM,
    primaryAttribute: 'wisdom',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '腓力': {
    group: DISCIPLE_GROUPS.WISDOM,
    primaryAttribute: 'wisdom',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '加略人犹大': {
    group: DISCIPLE_GROUPS.WISDOM,
    primaryAttribute: 'wisdom',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  
  // 勇气用户组
  '彼得': {
    group: DISCIPLE_GROUPS.COURAGE,
    primaryAttribute: 'courage',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '雅各（西庇太）': {
    group: DISCIPLE_GROUPS.COURAGE,
    primaryAttribute: 'courage',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '西门（奋锐党）': {
    group: DISCIPLE_GROUPS.COURAGE,
    primaryAttribute: 'courage',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '巴多罗买': {
    group: DISCIPLE_GROUPS.COURAGE,
    primaryAttribute: 'courage',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  
  // 信心用户组
  '多马': {
    group: DISCIPLE_GROUPS.FAITH,
    primaryAttribute: 'faith',
    initialValues: {
      courage: 0,
      faith: 9,
      wisdom: 0
    }
  },
  '安德烈': {
    group: DISCIPLE_GROUPS.FAITH,
    primaryAttribute: 'faith',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '达太': {
    group: DISCIPLE_GROUPS.FAITH,
    primaryAttribute: 'faith',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  },
  '雅各（亚勒腓）': {
    group: DISCIPLE_GROUPS.FAITH,
    primaryAttribute: 'faith',
    initialValues: {
      courage: 0,
      faith: 0,
      wisdom: 0
    }
  }
};

// 获取用户配置
export const getDiscipleConfig = (discipleName) => {
  return DISCIPLE_CONFIG[discipleName] || null;
};

// 获取用户的主要属性
export const getDisciplePrimaryAttribute = (discipleName) => {
  const config = getDiscipleConfig(discipleName);
  return config ? config.primaryAttribute : null;
};

// 获取用户的初始属性值
export const getDiscipleInitialValues = (discipleName) => {
  const config = getDiscipleConfig(discipleName);
  return config ? config.initialValues : {
    courage: 0,
    faith: 0,
    wisdom: 0
  };
};

// 获取用户组别
export const getDiscipleGroup = (discipleName) => {
  const config = getDiscipleConfig(discipleName);
  return config ? config.group : null;
};

// 获取组别对应的中文名称
export const getGroupDisplayName = (group) => {
  switch (group) {
    case DISCIPLE_GROUPS.WISDOM:
      return '智力用户';
    case DISCIPLE_GROUPS.COURAGE:
      return '勇气用户';
    case DISCIPLE_GROUPS.FAITH:
      return '信心用户';
    default:
      return '普通用户';
  }
};

// 获取组别对应的颜色
export const getGroupColor = (group) => {
  switch (group) {
    case DISCIPLE_GROUPS.WISDOM:
      return '#3498db'; // 蓝色
    case DISCIPLE_GROUPS.COURAGE:
      return '#e74c3c'; // 红色
    case DISCIPLE_GROUPS.FAITH:
      return '#f39c12'; // 橙色
    default:
      return '#95a5a6'; // 灰色
  }
};

// 检查用户是否可以增加指定属性
export const canIncrementAttribute = (discipleName, attribute) => {
  const primaryAttribute = getDisciplePrimaryAttribute(discipleName);
  return primaryAttribute === attribute;
};

// 获取所有用户列表（按组分类）
export const getDisciplesByGroup = () => {
  const result = {
    [DISCIPLE_GROUPS.WISDOM]: [],
    [DISCIPLE_GROUPS.COURAGE]: [],
    [DISCIPLE_GROUPS.FAITH]: []
  };
  
  Object.entries(DISCIPLE_CONFIG).forEach(([name, config]) => {
    result[config.group].push({
      name,
      ...config
    });
  });
  
  return result;
}; 