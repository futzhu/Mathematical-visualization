let scene, camera, renderer;

function init3D() {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // 创建相机
  camera = new THREE.PerspectiveCamera(75, 600/400, 0.1, 1000);
  camera.position.z = 5;

  // 创建渲染器
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(600, 400);
  document.getElementById('3d-container').appendChild(renderer.domElement);

  // 添加坐标系
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // 添加光源
  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(10, 10, 10);
  scene.add(light);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// 初始化3D场景
init3D();