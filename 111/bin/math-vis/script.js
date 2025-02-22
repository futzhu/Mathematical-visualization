// ================== 全局变量 ==================
let scene, camera, renderer;      // Three.js核心组件
let points = [];                  // 存储几何点
let currentMesh = null;           // 当前3D网格对象
const INIT_CAMERA_POS = { x: 8, y: 8, z: 8 }; // 初始相机位置

// ================== 初始化入口 ==================
document.addEventListener('DOMContentLoaded', () => {
    try {
        init3DScene();            // 初始化3D场景
        init2DPlot();             // 初始化2D图表
        bindEventListeners();     // 绑定事件监听
        initDynamicValues();      // 初始化动态值显示
        console.log('系统初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
        alert('系统初始化失败，请检查控制台日志');
    }
});

// ================== 3D场景初始化 ==================
function init3DScene() {
    // 1. 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // 2. 创建相机（带错误处理）
    try {
        camera = new THREE.PerspectiveCamera(
            75,
            document.getElementById('3d-container').clientWidth / 300,
            0.1,
            1000
        );
        reset3DView();
    } catch (error) {
        throw new Error(`相机创建失败: ${error.message}`);
    }

    // 3. 创建渲染器
    try {
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        update3DSize();
        document.getElementById('3d-container').appendChild(renderer.domElement);
    } catch (error) {
        throw new Error(`渲染器初始化失败: ${error.message}`);
    }

    // 4. 光照系统
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(10, 10, 10);
    const directionalLight2 = new THREE.DirectionalLight(0xffeedd, 0.3);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(ambientLight, directionalLight1, directionalLight2);

    // 5. 辅助工具
    scene.add(new THREE.AxesHelper(5));
    scene.add(new THREE.GridHelper(10, 20, 0xcccccc, 0xeeeeee));

    // 6. 初始绘图
    plot3DFunction();
    animate();
}

// ================== 2D绘图系统 ==================
function init2DPlot() {
    try {
        update2DPlot();
    } catch (error) {
        console.error('2D图表初始化失败:', error);
        document.getElementById('plot').innerHTML = 
            '<div class="error">图表初始化失败</div>';
    }
}

function update2DPlot() {
    try {
        // 获取输入值（带默认值回退）
        const amplitude = parseFloat(document.getElementById('amp').value) || 1;
        const frequency = parseFloat(document.getElementById('freq').value) || 1;
        const funcType = document.getElementById('functionType').value || 'sin';
        const color = document.getElementById('lineColor').value || '#3498db';

        // 生成数据
        const xValues = Array.from({length: 100}, (_, i) => i/10);
        const yValues = xValues.map(x => {
            switch(funcType) {
                case 'sin': return amplitude * Math.sin(frequency * x);
                case 'cos': return amplitude * Math.cos(frequency * x);
                case 'quadratic': return amplitude * x**2 + frequency * x;
                default: throw new Error('未知函数类型');
            }
        });

        // 更新图表
        Plotly.react('plot', [{
            x: xValues,
            y: yValues,
            mode: 'lines',
            line: { 
                color: color,
                width: 2,
                shape: 'spline'
            }
        }], {
            margin: {t: 30, b: 40, l: 60, r: 30},
            xaxis: {
                title: 'X轴',
                showgrid: true,
                gridcolor: '#dfe6e9',
                linecolor: '#2c3e50'
            },
            yaxis: {
                title: 'Y轴',
                showgrid: true,
                gridcolor: '#dfe6e9',
                linecolor: '#2c3e50'
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(255,255,255,0.9)'
        });
    } catch (error) {
        console.error('图表更新失败:', error);
        document.getElementById('plot').innerHTML = 
            `<div class="error">图表错误: ${error.message}</div>`;
    }
}

// ================== 事件处理系统 ==================
function bindEventListeners() {
    // 输入控件
    const inputs = ['amp', 'freq', 'functionType', 'lineColor'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                try {
                    update2DPlot();
                    if (id === 'lineColor') plot3DFunction();
                } catch (error) {
                    console.error('事件处理错误:', error);
                }
            });
        }
    });

    // 3D函数输入
    const funcInput = document.getElementById('3dFunc');
    if (funcInput) {
        funcInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                try {
                    plot3DFunction();
                } catch (error) {
                    console.error('3D绘图错误:', error);
                }
            }
        });
    }

    // 窗口大小变化
    window.addEventListener('resize', () => {
        try {
            update3DSize();
            camera.aspect = document.getElementById('3d-container').clientWidth / 300;
            camera.updateProjectionMatrix();
        } catch (error) {
            console.error('窗口调整错误:', error);
        }
    });
}

// ================== 3D功能模块 ==================
function plot3DFunction() {
    try {
        // 清除旧图形
        if (currentMesh) {
            scene.remove(currentMesh);
            currentMesh.geometry.dispose();
            currentMesh.material.dispose();
            currentMesh = null;
        }

        // 获取并验证输入
        const funcInput = document.getElementById('3dFunc');
        if (!funcInput) throw new Error('找不到3D函数输入框');
        const funcExpr = funcInput.value.trim();
        if (!funcExpr) throw new Error('请输入3D函数表达式');

        // 编译数学表达式
        const func = math.parse(funcExpr).compile();

        // 创建几何体（带异常边界处理）
        const geometry = new THREE.ParametricGeometry((u, v, target) => {
            try {
                const x = (u - 0.5) * 4;  // x ∈ [-2, 2]
                const y = (v - 0.5) * 4;  // y ∈ [-2, 2]
                const z = func.evaluate({x, y});
                if (isNaN(z)) throw new Error('计算结果不是数字');
                target.set(x, y, z);
            } catch (error) {
                console.error('参数计算错误:', error);
                target.set(0, 0, 0);
            }
        }, 50, 50);

        // 创建材质
        const material = new THREE.MeshPhongMaterial({
            color: document.getElementById('lineColor').value || '#3498db',
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        // 添加网格
        currentMesh = new THREE.Mesh(geometry, material);
        scene.add(currentMesh);
    } catch (error) {
        console.error('3D绘图失败:', error);
        alert(`3D错误: ${error.message}`);
    }
}

// ================== 工具函数 ==================
function reset3DView() {
    try {
        camera.position.set(INIT_CAMERA_POS.x, INIT_CAMERA_POS.y, INIT_CAMERA_POS.z);
        camera.lookAt(0, 0, 0);
    } catch (error) {
        console.error('视角重置失败:', error);
    }
}

function update3DSize() {
    try {
        const container = document.getElementById('3d-container');
        if (!container) throw new Error('找不到3D容器');
        renderer.setSize(container.clientWidth, 300);
    } catch (error) {
        console.error('尺寸更新失败:', error);
    }
}

function animate() {
    try {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    } catch (error) {
        console.error('动画循环错误:', error);
    }
}

// ================== 数据持久化 ==================
function saveProject() {
    try {
        const project = {
            points: points.map(p => ({
                x: p.position.x.toFixed(2),
                y: p.position.y.toFixed(2),
                z: p.position.z.toFixed(2)
            })),
            settings: {
                amp: document.getElementById('amp').value,
                freq: document.getElementById('freq').value,
                funcType: document.getElementById('functionType').value,
                color: document.getElementById('lineColor').value,
                func3D: document.getElementById('3dFunc').value
            }
        };
        
        localStorage.setItem('mathVisProject', JSON.stringify(project));
        alert('项目保存成功！');
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，请检查控制台日志');
    }
}

function loadProject() {
    try {
        const project = JSON.parse(localStorage.getItem('mathVisProject'));
        if (!project) throw new Error('找不到保存的项目');

        // 清除旧数据
        points.forEach(p => scene.remove(p));
        points = [];
        if (currentMesh) {
            scene.remove(currentMesh);
            currentMesh.geometry.dispose();
            currentMesh.material.dispose();
            currentMesh = null;
        }

        // 恢复设置
        document.getElementById('amp').value = project.settings.amp || 1;
        document.getElementById('freq').value = project.settings.freq || 1;
        document.getElementById('functionType').value = project.settings.funcType || 'sin';
        document.getElementById('lineColor').value = project.settings.color || '#3498db';
        document.getElementById('3dFunc').value = project.settings.func3D || 'x^2 + y^2';

        // 恢复3D图形
        plot3DFunction();

        // 恢复点
        project.points.forEach(pos => {
            const geometry = new THREE.SphereGeometry(0.1);
            const material = new THREE.MeshBasicMaterial({color: 0xff0000});
            const point = new THREE.Mesh(geometry, material);
            point.position.set(
                parseFloat(pos.x) || 0,
                parseFloat(pos.y) || 0,
                parseFloat(pos.z) || 0
            );
            scene.add(point);
            points.push(point);
        });

        update2DPlot();
        alert('项目加载成功！');
    } catch (error) {
        console.error('加载失败:', error);
        alert(`加载失败: ${error.message}`);
    }
}

// ================== 辅助功能 ==================
function initDynamicValues() {
    // 初始化滑块数值显示
    const updateDisplay = (sliderId, displayId) => {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(displayId);
        if (!slider || !display) return;

        display.textContent = parseFloat(slider.value).toFixed(1);
        slider.addEventListener('input', () => {
            display.textContent = parseFloat(slider.value).toFixed(1);
        });
    };

    updateDisplay('amp', 'ampValue');
    updateDisplay('freq', 'freqValue');
}

// ================== 几何工具 ==================
function addPoint() {
    try {
        const geometry = new THREE.SphereGeometry(0.1);
        const material = new THREE.MeshBasicMaterial({color: 0xff0000});
        const point = new THREE.Mesh(geometry, material);
        
        point.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            0
        );
        
        scene.add(point);
        points.push(point);
    } catch (error) {
        console.error('添加点失败:', error);
        alert('无法添加点，请检查控制台');
    }
}

function addLine() {
    try {
        if (points.length < 2) throw new Error('需要至少两个点');
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
            points[points.length-2].position,
            points[points.length-1].position
        ]);
        
        const line = new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({color: 0x00ff00})
        );
        scene.add(line);
        
        // 计算距离
        const p1 = points[points.length-2].position;
        const p2 = points[points.length-1].position;
        const distance = p1.distanceTo(p2).toFixed(2);
        alert(`两点距离: ${distance}`);
    } catch (error) {
        console.error('添加线失败:', error);
        alert(error.message);
    }
}