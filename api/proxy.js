const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 音乐API配置
const MUSIC_APIS = {
  netease: {
    search: 'https://music.163.com/api/cloudsearch/pc',
    songUrl: 'https://music.163.com/api/song/enhance/player/url',
    lyric: 'https://music.163.com/api/song/lyric',
    detail: 'https://music.163.com/api/v3/song/detail'
  }
};

// 统一代理接口
app.get('/', async (req, res) => {
  try {
    const { types, id, source = 'netease', keywords, limit = 50, br = 'exhigh' } = req.query;
    
    console.log(`[PROXY] Request: ${types}`, { id, keywords, source });
    
    let apiUrl = '';
    const requestOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://music.163.com/',
        'Origin': 'https://music.163.com'
      }
    };

    switch (types) {
      case 'search':
        if (source === 'netease') {
          apiUrl = `${MUSIC_APIS.netease.search}?s=${encodeURIComponent(keywords)}&type=1&limit=${limit}&offset=0`;
        }
        break;
        
      case 'url':
        if (source === 'netease') {
          const levelMap = {
            'standard': 'standard',
            'higher': 'higher', 
            'exhigh': 'exhigh',
            'lossless': 'lossless'
          };
          const level = levelMap[br] || 'exhigh';
          apiUrl = `${MUSIC_APIS.netease.songUrl}?id=${id}&ids=[${id}]&br=999000&level=${level}`;
        }
        break;
        
      case 'lyric':
        if (source === 'netease') {
          apiUrl = `${MUSIC_APIS.netease.lyric}?id=${id}&lv=-1&kv=-1&tv=-1`;
        }
        break;
        
      case 'detail':
        if (source === 'netease') {
          apiUrl = `${MUSIC_APIS.netease.detail}?id=${id}&ids=[${id}]`;
        }
        break;
        
      default:
        return res.status(400).json({ 
          code: 400,
          msg: 'Unsupported request type',
          types: types 
        });
    }

    if (!apiUrl) {
      return res.status(400).json({ 
        code: 400,
        msg: 'Unsupported platform or request type',
        source: source,
        types: types
      });
    }

    console.log(`[PROXY] Fetching: ${apiUrl}`);
    const response = await fetch(apiUrl, requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    console.log(`[PROXY] Success: ${types}, data received`);

    // 统一响应格式
    res.json({
      code: 200,
      data: responseData,
      source: source,
      types: types,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('[PROXY] Error:', error);
    res.status(500).json({ 
      code: 500,
      msg: 'Proxy request failed: ' + error.message,
      types: req.query.types
    });
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'music-proxy',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// Vercel需要导出默认模块
module.exports = app;
