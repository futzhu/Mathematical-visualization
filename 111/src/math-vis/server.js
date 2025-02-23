const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const math = require('mathjs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'math-vis')));

// 增强的导数计算API
app.post('/api/derivative', (req, res) => {
    try {
        const expression = req.body.expression;
        if (!expression) throw new Error('缺少表达式参数');
        
        const node = math.parse(expression);
        const derivative = math.derivative(node, 'x').toString();
        
        res.json({
            success: true,
            result: derivative,
            latex: math.parse(derivative).toTex()
        });
    } catch (error) {
        console.error('导数计算错误:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// 静态文件路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    res.status(500).send('服务器内部错误');
});

// 启动服务
app.listen(PORT, () => {
    console.log(`
    ===================================
      数学可视化平台服务已启动
      访问地址: http://localhost:${PORT}
    ===================================
    `);
});