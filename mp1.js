/**
 * @file Custom Animation
 * @author Felipe Arias <felipea2@illinois.edu>
 * Based on code from CS 418 @ UIUC by Eric Shaffer
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The angle of rotation around the x axis */
var defAngle = 0;

/** @global Number of vertices around the circle boundary */
var numCircleVerts = 100;

/** @global Two times pi to save some multiplications...*/
var twicePi=2.0*3.14159;
    
//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
}


/**
 * Calculate the deformation for a given vertex on the circle
 @param {number} x coordinate of circle boundary point
 @param {number} y coordinate of circle boundary point
 @param {number} angle around the circle of the boundary point
 @return {object} a deformation vector to be applied to the boundary
 */
function deformSin(x,y,angle){
    var circPt = vec2.fromValues(x,y);
    var dist = 0.2*Math.cos(((angle)+degToRad(defAngle))*6);
    vec2.normalize(circPt,circPt);
    vec2.scale(circPt,circPt,dist);
    return circPt;
}

/**
 * Populate vertex buffer with data for custom animation
  @param {number} number of vertices to use around the circle boundary
 */
function loadCustomVertices(numVertices) {
    console.log("Frame",defAngle);
 //Generate the vertex positions    
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    
  // Start with vertex at the origin    
  var triangleVertices = [0.0,0.0,0.0];

  //Generate a triangle fan around origin
  var radius=0.5
  var z=0.0;    
    
  for (i=0;i<=numVertices;i++){
      angle = i *  twicePi / numVertices;
      x=(radius * Math.cos(angle));
      y=(radius * Math.sin(angle));
      //Apply deformation to point
      cPt = deformSin(x,y,angle);
      triangleVertices.push(x+cPt[0]);
      triangleVertices.push(y+cPt[1]);
      triangleVertices.push(z);
  }
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = numVertices+2;
}

/**
 * Populate color buffer with data for custom animation
  @param {number} number of vertices to use around the circle boundary
 */
function loadCustomColors(numVertices) {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    
  // Set the heart of the circle to be black    
  var colors = [0.0,0.0,0.0,1.0];
  
  var a=1.0;
  var g=0.0;
    
  
  var halfV= numVertices/2.0;

  //Add offsets to color so that it changes depending on angle
  for (i=0;i<=numVertices;i++){
      angle = i *  twicePi / numVertices;
      r=Math.abs((i-halfV)/halfV);
      b=1.0-r;
      
      if (angle>twicePi*0.5){
        colors.push(r+angle);
        colors.push(g+angle*0.25);
        colors.push(b+angle*0.4); 
      }
      else{
        colors.push(r+(twicePi-angle));
        colors.push(g+(twicePi-angle)*0.25);
        colors.push(b+(twicePi-angle)*0.4);   
      }
      
      colors.push(a);
  }
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = numVertices+2;  
}

/**
 * Populate buffers with data for UofI Logo (Startup)
 */
function setupBuffers() {
    
  //Generate the vertex positions    
  loadCustomVertices();

  //Generate the vertex colors
  loadCustomColors();
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

  mat4.identity(mvMatrix);
  mat4.identity(pMatrix);
    

  mat4.rotateZ(mvMatrix, mvMatrix, degToRad(-90));
  
    
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  setMatrixUniforms();
    
  //depending on which animation, use a traingle fan or a mesh


  gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() { 
    defAngle= (defAngle+1.0) % 360;
}

/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    
    requestAnimFrame(tick);

    loadCustomVertices(numCircleVerts);
    loadCustomColors(numCircleVerts);
    draw(false);
    
    animate();
}

