import { Application, Assets, Sprite, Graphics, Text } from "pixi.js";

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "#FFFFFF", resizeTo: window });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // 创建主要容器，用于缩放操作
  const mainContainer = new Sprite();
  mainContainer.eventMode = "static";
  mainContainer.cursor = "grab";

  // 设置初始位置在屏幕中央
  mainContainer.x = app.screen.width / 2;
  mainContainer.y = app.screen.height / 2;

  // 添加容器到舞台
  app.stage.addChild(mainContainer);

  // Load the bunny texture
  const texture = await Assets.load("/assets/bunny.png");

  // Create a bunny Sprite
  const bunny = new Sprite(texture);

  // Center the sprite's anchor point
  bunny.anchor.set(0.5);

  // Move the sprite to the center of the screen
  bunny.position.set(app.screen.width / 2, app.screen.height / 2);

  // Add the bunny to the stage
  app.stage.addChild(bunny);

  // 创建一个绿色正方形
  const square = new Graphics();
  square.beginFill(0x00ff00); // 绿色
  square.drawRect(0, 0, 100, 100); // 绘制100x100的正方形
  square.endFill();

  // 设置正方形位置在屏幕左上角
  square.position.set(100, 100);

  // 添加正方形到舞台
  app.stage.addChild(square);

  // 创建图形对象
  const circuit = new Graphics();

  // 绘制网格（作为背景）
  drawGrid(circuit, app.screen.width, app.screen.height, 20);

  // 添加电路图到主容器
  mainContainer.addChild(circuit);

  // 绘制IC (U4)
  drawIC(circuit, 500, 400);

  // 绘制电容 (C1, C2, C4, C5)
  drawCapacitor(circuit, 280, 730, "C1", "47nF");
  drawCapacitor(circuit, 750, 640, "C2", "10nF");
  drawCapacitor(circuit, 930, 640, "C4", "100nF");
  drawElectrolyticCapacitor(circuit, 930, 230, "C5", "100uF");

  // 绘制电阻 (R5, R8)
  drawResistor(circuit, 170, 410, "R5", "10k");
  drawResistor(circuit, 170, 230, "R8", "10k");

  // 绘制二极管 (D2, D3)
  drawDiode(circuit, 170, 560, "D2");
  drawDiode(circuit, 280, 300, "D3");

  // 绘制VCC和接地符号
  drawVCC(circuit, 925, 70);
  drawGround(circuit, 590, 820);
  drawGround(circuit, 930, 320);

  // 绘制输出标签
  drawOutputLabel(circuit, 1140, 360, "VO1");

  // 画连接线
  drawWires(circuit);

  // 添加文本标签
  addLabels(app);

  // 实现缩放功能
  setupZoom(app, mainContainer);
})();

// 实现缩放功能
function setupZoom(app: Application, container: Sprite) {
  // 缩放配置
  const minScale = 0.2;
  const maxScale = 3.0;
  const scaleStep = 0.1;

  // 监听鼠标滚轮事件
  app.canvas.addEventListener("wheel", (event) => {
    event.preventDefault();

    // 确定缩放方向
    const direction = event.deltaY < 0 ? 1 : -1;

    // 获取鼠标在canvas中的位置
    const mouseX = event.clientX - app.canvas.getBoundingClientRect().left;
    const mouseY = event.clientY - app.canvas.getBoundingClientRect().top;

    // 计算鼠标相对于容器的位置
    const localPos = container.toLocal({ x: mouseX, y: mouseY });

    // 计算新的缩放值
    const newScale = Math.max(
      minScale,
      Math.min(maxScale, container.scale.x + direction * scaleStep)
    );

    // 如果缩放没有变化，则不进行操作
    if (newScale === container.scale.x) return;

    // 计算新的容器位置，使鼠标指向的点保持不变
    const newX = mouseX - localPos.x * newScale;
    const newY = mouseY - localPos.y * newScale;

    // 更新容器的缩放和位置
    container.scale.set(newScale);
    container.position.set(newX, newY);
  });

  // 添加拖动功能
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  container.on("pointerdown", (event) => {
    isDragging = true;
    dragStartX = event.global.x - container.x;
    dragStartY = event.global.y - container.y;
    container.cursor = "grabbing";
  });

  app.canvas.addEventListener("pointermove", (event) => {
    if (isDragging) {
      container.x = event.clientX - dragStartX;
      container.y = event.clientY - dragStartY;
    }
  });

  app.canvas.addEventListener("pointerup", () => {
    isDragging = false;
    container.cursor = "grab";
  });

  app.canvas.addEventListener("pointerleave", () => {
    isDragging = false;
    container.cursor = "grab";
  });

  // 添加双击重置功能 - 使用双击计数跟踪
  let clickTime = 0;
  let clickCount = 0;

  container.on("pointerup", (event) => {
    const currentTime = new Date().getTime();
    if (currentTime - clickTime < 300) {
      clickCount++;
      if (clickCount === 2) {
        // 重置容器的位置和缩放
        container.scale.set(1);
        container.x = app.screen.width / 2;
        container.y = app.screen.height / 2;
        clickCount = 0;
      }
    } else {
      clickCount = 1;
    }
    clickTime = currentTime;
  });

  // 显示当前缩放比例
  const zoomText = new Text("缩放: 100%", {
    fontFamily: "Arial",
    fontSize: 14,
    fill: 0x000000,
  });
  zoomText.position.set(10, 10);
  app.stage.addChild(zoomText);

  // 监听容器的scale变化，更新缩放文本
  app.ticker.add(() => {
    zoomText.text = `缩放: ${Math.round(container.scale.x * 100)}%`;
  });
}

// 绘制电阻
function drawResistor(
  graphics: Graphics,
  x: number,
  y: number,
  name: string,
  value: string
) {
  // 绘制电阻矩形
  graphics.lineStyle(2, 0xdd0000);
  graphics.beginFill(0xffffff);
  graphics.drawRect(x - 30, y - 40, 60, 80);
  graphics.endFill();

  // 添加电阻标签
  const text = new Text(name, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  text.position.set(x - 50, y - 40);
  graphics.addChild(text);

  // 添加电阻值
  const valueText = new Text(value, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  valueText.position.set(x - 50, y + 10);
  graphics.addChild(valueText);

  // 绘制连接点
  graphics.beginFill(0xdd0000);
  graphics.drawCircle(x, y - 40, 5); // 上连接点
  graphics.drawCircle(x, y + 40, 5); // 下连接点
  graphics.endFill();
}

// 绘制电容
function drawCapacitor(
  graphics: Graphics,
  x: number,
  y: number,
  name: string,
  value: string
) {
  // 绘制电容线
  graphics.lineStyle(2, 0xdd0000);
  graphics.moveTo(x - 20, y);
  graphics.lineTo(x + 20, y);

  graphics.moveTo(x - 10, y - 20);
  graphics.lineTo(x - 10, y + 20);

  graphics.moveTo(x + 10, y - 20);
  graphics.lineTo(x + 10, y + 20);

  // 添加电容标签
  const text = new Text(name, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  text.position.set(x + 30, y - 20);
  graphics.addChild(text);

  // 添加电容值
  const valueText = new Text(value, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  valueText.position.set(x + 30, y + 10);
  graphics.addChild(valueText);

  // 绘制连接点
  graphics.beginFill(0xdd0000);
  graphics.drawCircle(x, y - 20, 5); // 上连接点
  graphics.drawCircle(x, y + 20, 5); // 下连接点
  graphics.endFill();
}

// 绘制电解电容
function drawElectrolyticCapacitor(
  graphics: Graphics,
  x: number,
  y: number,
  name: string,
  value: string
) {
  // 绘制电容线
  graphics.lineStyle(2, 0xdd0000);
  graphics.moveTo(x - 20, y);
  graphics.lineTo(x + 20, y);

  // 绘制弧线表示电解电容
  graphics.moveTo(x - 10, y - 20);
  graphics.lineTo(x - 10, y + 20);

  graphics.beginFill(0xffffff);
  graphics.drawRect(x + 5, y - 20, 10, 40);
  graphics.endFill();

  // 添加极性标记
  graphics.lineStyle(2, 0xdd0000);
  graphics.moveTo(x - 25, y - 10);
  graphics.lineTo(x - 15, y - 10);
  graphics.moveTo(x - 20, y - 15);
  graphics.lineTo(x - 20, y - 5);

  // 添加电容标签
  const text = new Text(name, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  text.position.set(x + 30, y - 20);
  graphics.addChild(text);

  // 添加电容值
  const valueText = new Text(value, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  valueText.position.set(x + 30, y + 10);
  graphics.addChild(valueText);

  // 绘制连接点
  graphics.beginFill(0xdd0000);
  graphics.drawCircle(x, y - 20, 5); // 上连接点
  graphics.drawCircle(x, y + 20, 5); // 下连接点
  graphics.endFill();
}

// 绘制二极管
function drawDiode(graphics: Graphics, x: number, y: number, name: string) {
  // 绘制二极管三角形
  graphics.lineStyle(2, 0xdd0000);
  graphics.beginFill(0xffffff);
  graphics.moveTo(x - 15, y - 20);
  graphics.lineTo(x + 15, y);
  graphics.lineTo(x - 15, y + 20);
  graphics.lineTo(x - 15, y - 20);
  graphics.endFill();

  // 绘制二极管线
  graphics.lineStyle(2, 0xdd0000);
  graphics.moveTo(x + 15, y - 20);
  graphics.lineTo(x + 15, y + 20);

  // 添加二极管标签
  const text = new Text(name, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  text.position.set(x - 50, y - 10);
  graphics.addChild(text);

  // 绘制连接点
  graphics.beginFill(0xdd0000);
  graphics.drawCircle(x, y - 20, 5); // 上连接点
  graphics.drawCircle(x, y + 20, 5); // 下连接点
  graphics.endFill();
}

// 绘制IC (U4)
function drawIC(graphics: Graphics, x: number, y: number) {
  // 绘制IC矩形
  graphics.lineStyle(2, 0xdd0000);
  graphics.beginFill(0xffffff);
  graphics.drawRect(x - 80, y - 120, 160, 240);
  graphics.endFill();

  // 添加IC标签
  const text = new Text("U4", {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  text.position.set(x, y - 90);
  text.anchor.set(0.5, 0);
  graphics.addChild(text);

  // 添加引脚名称
  const pinNames = [
    "VCC",
    "RST",
    "OUT",
    "CONT",
    "GND",
    "THRES",
    "TRIG",
    "DISCH",
  ];
  const pinNumbers = ["8", "4", "3", "5", "1", "6", "2", "7"];
  const pinPositions = [
    { x: x - 30, y: y - 120 }, // VCC (8)
    { x: x + 30, y: y - 120 }, // RST (4)
    { x: x + 80, y: y - 60 }, // OUT (3)
    { x: x + 80, y: y + 20 }, // CONT (5)
    { x: x, y: y + 120 }, // GND (1)
    { x: x - 40, y: y + 60 }, // THRES (6)
    { x: x - 80, y: y - 20 }, // TRIG (2)
    { x: x - 80, y: y - 80 }, // DISCH (7)
  ];

  for (let i = 0; i < pinNames.length; i++) {
    const pinText = new Text(pinNames[i], {
      fontFamily: "Arial",
      fontSize: 16,
      fill: 0x000000,
      align: "center",
    });

    const numText = new Text(pinNumbers[i], {
      fontFamily: "Arial",
      fontSize: 16,
      fill: 0x000000,
      align: "center",
    });

    // 调整位置以适应IC
    if (i < 2) {
      // VCC, RST (顶部)
      pinText.position.set(pinPositions[i].x, pinPositions[i].y + 20);
      pinText.anchor.set(0.5, 0);
      numText.position.set(pinPositions[i].x, pinPositions[i].y + 40);
      numText.anchor.set(0.5, 0);
    } else if (i < 4) {
      // OUT, CONT (右侧)
      pinText.position.set(pinPositions[i].x - 40, pinPositions[i].y);
      pinText.anchor.set(1, 0.5);
      numText.position.set(pinPositions[i].x - 15, pinPositions[i].y);
      numText.anchor.set(1, 0.5);
    } else if (i === 4) {
      // GND (底部)
      pinText.position.set(pinPositions[i].x, pinPositions[i].y - 40);
      pinText.anchor.set(0.5, 1);
      numText.position.set(pinPositions[i].x, pinPositions[i].y - 20);
      numText.anchor.set(0.5, 1);
    } else {
      // THRES, TRIG, DISCH (左侧)
      pinText.position.set(pinPositions[i].x + 40, pinPositions[i].y);
      pinText.anchor.set(0, 0.5);
      numText.position.set(pinPositions[i].x + 15, pinPositions[i].y);
      numText.anchor.set(0, 0.5);
    }

    graphics.addChild(pinText);
    graphics.addChild(numText);
  }

  // 添加频率标记
  const freqText = new Text("100kHz", {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  freqText.position.set(x, y + 160);
  freqText.anchor.set(0.5, 0);
  graphics.addChild(freqText);

  // 绘制引脚连接点
  graphics.beginFill(0xdd0000);
  for (const pos of pinPositions) {
    graphics.drawCircle(pos.x, pos.y, 5);
  }
  graphics.endFill();
}

// 绘制VCC符号
function drawVCC(graphics: Graphics, x: number, y: number) {
  // 绘制VCC线
  graphics.lineStyle(2, 0xdd0000);
  graphics.moveTo(x, y);
  graphics.lineTo(x, y + 30);

  // 绘制VCC横线
  graphics.moveTo(x - 20, y);
  graphics.lineTo(x + 20, y);

  // 添加VCC标签
  const text = new Text("VCC", {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  text.position.set(x, y - 30);
  text.anchor.set(0.5, 0);
  graphics.addChild(text);

  // 绘制连接点
  graphics.beginFill(0xdd0000);
  graphics.drawCircle(x, y + 30, 5);
  graphics.endFill();
}

// 绘制接地符号
function drawGround(graphics: Graphics, x: number, y: number) {
  // 绘制接地线
  graphics.lineStyle(2, 0xdd0000);
  graphics.moveTo(x, y - 30);
  graphics.lineTo(x, y);

  // 绘制接地符号
  graphics.moveTo(x - 20, y);
  graphics.lineTo(x + 20, y);

  graphics.moveTo(x - 15, y + 10);
  graphics.lineTo(x + 15, y + 10);

  graphics.moveTo(x - 10, y + 20);
  graphics.lineTo(x + 10, y + 20);

  // 绘制连接点
  graphics.beginFill(0xdd0000);
  graphics.drawCircle(x, y - 30, 5);
  graphics.endFill();
}

// 绘制输出标签
function drawOutputLabel(
  graphics: Graphics,
  x: number,
  y: number,
  label: string
) {
  // 绘制箭头
  graphics.lineStyle(2, 0xdd0000);
  graphics.beginFill(0xffffff);
  graphics.moveTo(x - 80, y - 20);
  graphics.lineTo(x, y);
  graphics.lineTo(x - 80, y + 20);
  graphics.lineTo(x - 80, y - 20);
  graphics.endFill();

  // 添加标签
  const text = new Text(label, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  text.position.set(x + 20, y - 10);
  graphics.addChild(text);

  // 绘制连接点
  graphics.beginFill(0xdd0000);
  graphics.drawCircle(x - 80, y, 5);
  graphics.endFill();
}

// 绘制连接线
function drawWires(graphics: Graphics) {
  graphics.lineStyle(2, 0x00aa00);

  // 水平连接线
  const horizontalLines = [
    { x1: 170, y1: 190, x2: 925, y2: 190 }, // 顶部电源线
    { x1: 170, y1: 270, x2: 280, y2: 270 }, // R8到D3
    { x1: 170, y1: 370, x2: 420, y2: 370 }, // R5到TRIG
    { x1: 280, y1: 460, x2: 420, y2: 460 }, // D3到THRES
    { x1: 170, y1: 600, x2: 280, y2: 600 }, // D2到C1
    { x1: 280, y1: 710, x2: 590, y2: 710 }, // C1到GND
    { x1: 750, y1: 620, x2: 930, y2: 620 }, // C2到C4
    { x1: 590, y1: 620, x2: 750, y2: 620 }, // GND到C2
    { x1: 580, y1: 340, x2: 930, y2: 340 }, // OUT到VO1
    { x1: 580, y1: 340, x2: 1060, y2: 340 }, // OUT到输出标签
  ];

  // 垂直连接线
  const verticalLines = [
    { x1: 925, y1: 70, x2: 925, y2: 190 }, // VCC符号到顶部电源线
    { x1: 470, y1: 190, x2: 470, y2: 280 }, // 顶部电源线到VCC引脚
    { x1: 530, y1: 190, x2: 530, y2: 280 }, // 顶部电源线到RST引脚
    { x1: 280, y1: 270, x2: 280, y2: 460 }, // D3到THRES连接
    { x1: 420, y1: 370, x2: 420, y2: 380 }, // TRIG引脚连接
    { x1: 420, y1: 460, x2: 420, y2: 440 }, // THRES引脚连接
    { x1: 170, y1: 450, x2: 170, y2: 520 }, // R5到D2
    { x1: 170, y1: 300, x2: 170, y2: 330 }, // R8到R5
    { x1: 280, y1: 520, x2: 280, y2: 600 }, // D3到D2
    { x1: 280, y1: 600, x2: 280, y2: 710 }, // D2到C1
    { x1: 590, y1: 620, x2: 590, y2: 710 }, // GND到C1
    { x1: 590, y1: 710, x2: 590, y2: 790 }, // C1到GND符号
    { x1: 750, y1: 520, x2: 750, y2: 620 }, // CONT到C2
    { x1: 750, y1: 420, x2: 750, y2: 520 }, // IC引脚到CONT
    { x1: 930, y1: 250, x2: 930, y2: 340 }, // C5到VO1
    { x1: 930, y1: 340, x2: 930, y2: 620 }, // VO1到C4
  ];

  // 绘制水平线
  for (const line of horizontalLines) {
    graphics.moveTo(line.x1, line.y1);
    graphics.lineTo(line.x2, line.y2);
  }

  // 绘制垂直线
  for (const line of verticalLines) {
    graphics.moveTo(line.x1, line.y1);
    graphics.lineTo(line.x2, line.y2);
  }

  // 添加连接点
  graphics.beginFill(0xdd0000);
  const junctionPoints = [
    { x: 170, y: 190 },
    { x: 170, y: 270 },
    { x: 170, y: 370 },
    { x: 170, y: 450 },
    { x: 170, y: 520 },
    { x: 170, y: 600 },
    { x: 280, y: 270 },
    { x: 280, y: 460 },
    { x: 280, y: 600 },
    { x: 280, y: 710 },
    { x: 470, y: 190 },
    { x: 530, y: 190 },
    { x: 590, y: 620 },
    { x: 590, y: 710 },
    { x: 750, y: 620 },
    { x: 930, y: 340 },
    { x: 930, y: 620 },
    { x: 925, y: 190 },
  ];

  for (const point of junctionPoints) {
    graphics.drawCircle(point.x, point.y, 5);
  }
  graphics.endFill();
}

// 添加文本标签
function addLabels(app: Application) {
  // VO1标签
  const vo1Text = new Text("VO1", {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x0000dd,
    align: "center",
  });
  vo1Text.position.set(850, 340);
  app.stage.addChild(vo1Text);
}

// 绘制网格
function drawGrid(
  graphics: Graphics,
  width: number,
  height: number,
  gridSize: number,
) {
  graphics.lineStyle(0.5, 0xcccccc, 0.5);

  // 水平线
  for (let y = 0; y <= height; y += gridSize) {
    graphics.moveTo(0, y);
    graphics.lineTo(width, y);
  }

  // 垂直线
  for (let x = 0; x <= width; x += gridSize) {
    graphics.moveTo(x, 0);
    graphics.lineTo(x, height);
  }
}
