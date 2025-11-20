const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());

// 支持的所有音乐API接口 - 保留您原来的所有接口
const MUSIC_APIS = [
  'https://musicapi.hangdn.com',
  'https://music.gdstudio.org',
  'https://wy.1356666.xyz', 
  'https://music-api.heheda.top',
  'https://api.injahow.cn/meting',
  'https://music.163api.xyz',
  'https://music-api.898899.xyz'
];

// 统一代理接口
app.get('/', async (req, res) => {
  try {
    const { types, id, source = 'netease', keywords, limit = 50, br = 'exhigh', s } = req.query;
    
    console.log(`[PROXY] 请求: types=${types}, id=${id}, keywords=${keywords}`);
    
    // 随机选择一个可用的API
    const randomAPI = MUSIC_APIS[Math.floor(Math.random() * MUSIC_APIS.length)];
    let apiUrl = '';
    
    // 构建请求URL - 支持您原来的所有接口格式
    if (randomAPI.includes('meting')) {
      // meting API格式
      switch (types) {
        case 'search':
          apiUrl = `${randomAPI}?type=search&id=${encodeURIComponent(keywords)}`;
          break;
        case 'url':
          apiUrl = `${randomAPI}?type=url&id=${id}`;
          break;
        case 'lyric':
          apiUrl = `${randomAPI}?type=lyric&id=${id}`;
          break;
      }
    } else {
      // 标准网易云API格式
      switch (types) {
        case 'search':
          apiUrl = `${randomAPI}/search?keywords=${encodeURIComponent(keywords)}&limit=${limit}`;
          break;
        case 'url':
          const levelMap = {
            'standard': 'standard',
            'higher': 'higher', 
            'exhigh': 'exhigh',
            'lossless': 'lossless'
          };
          const level = levelMap[br] || 'exhigh';
          apiUrl = `${randomAPI}/song/url/v1?id=${id}&level=${level}`;
          break;
        case 'lyric':
          apiUrl = `${randomAPI}/lyric?id=${id}`;
          break;
        case 'detail':
          apiUrl = `${randomAPI}/song/detail?ids=${id}`;
          break;
      }
    }

    if (!apiUrl) {
      return res.status(400).json({ 
        code: 400,
        msg: '不支持的请求类型',
        types: types 
      });
    }

    console.log(`[PROXY] 使用API: ${randomAPI}`);
    console.log(`[PROXY] 请求URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    console.log(`[PROXY] 成功: ${types}`);

    // 统一响应格式
    res.json({
      code: 200,
      data: responseData,
      source: source,
      types: types,
      apiUsed: randomAPI,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('[PROXY] 错误:', error);
    res.status(500).json({ 
      code: 500,
      msg: '代理请求失败: ' + error.message,
      types: req.query.types
    });
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'music-proxy',
    availableAPIs: MUSIC_APIS.length,
    timestamp: Date.now()
  });
});

// API列表接口
app.get('/apis', (req, res) => {
  res.json({
    code: 200,
    data: MUSIC_APIS,
    count: MUSIC_APIS.length
  });
});

module.exports = app;
