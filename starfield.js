// starfield background

/**
 * @const
 */
var STARFIELD_DEBUG = true;

if(STARFIELD_DEBUG)
{
    if (!window.console) console = {};
    console.log = console.log || function(){};
    console.warn = console.warn || function(){};
    console.error = console.error || function(){};
    console.info = console.info || function(){};
}
else
{
    if (!window.console) console = {};
    console.log = function(){};
    console.warn = function(){};
    console.error = function(){};
    console.info = function(){};
}

if(!window.requestAnimationFrame)
{
    window.requestAnimationFrame = (function(){
        return  window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
            };
    })();
}

/**
 * @constructor
 */
function Starfield(container, numStars)
{
    ///////////////////
    // private data
    ///////////////////

    var self = this;
    var lastTime = new Date().getTime();
    numStars = numStars !== undefined ? numStars : 4096;

    var xscale = 2048;
    var yscale = 2048;
    var zscale = 0.5;

    var particleRadius = 0.5;
    var particleVariance = 0.5;
    var particleSpeed = 0.01;

    var arrayBuffer = null;
    var arrayView = null;

    var canvas = null;
    var gl = null;

    var shader = null;
    var projectionMatrixUniform = null;
    var vertexAttrib = null;
    var spriteScaleUniform = null;

    var permTable = function()
    {
        var numbers = [];
        for(var i = 0; i < 256; ++i)
        {
            numbers.push(i);
        }

        var perm = [];
        while(numbers.length > 0)
        {
            perm.push(numbers.splice(Math.floor(Math.random() * numbers.length), 1)[0]);
        }

        return perm;
    }();


    ///////////////////////////////
    // private methods
    ///////////////////////////////

    /**
     * \return an array of two values between -1 and 1.
     */
    function permRand2D(value)
    {
        var intval = Math.floor(value);

        var byte0 = 0;
        var byte1 = 0;
        for(var i = 7; i >= 0; --i)
        {
            byte0 += ((intval >> (i * 2 + 1)) & 1) * Math.pow(2, i);
            byte1 += ((intval >> (i * 2)) & 1) * Math.pow(2, i);
        }

        var x = (permTable[byte0] + (permTable[byte1] >> 1)) / 383 - 0.5;
        var y = (permTable[(byte0 + 123) % 256] + (permTable[(byte1 + 123) % 256] >> 1)) / 383 - 0.5;
        return [x, y];
    }

    function createCanvas()
    {
        canvas = document.createElement("canvas");
        // TODO handle browsers without canvas support
        if(canvas)
        {
            var contextNames = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];
            for(var i = 0; i < contextNames.length; ++i)
            {
                try
                {
                    gl = canvas.getContext(contextNames[i], {antialias: true});
                }
                catch(e)
                { }

                if(gl) break;
            }

            if(gl)
            {
                container.appendChild(canvas);
                resizeCanvas();
            }
        }
    }

    function resizeCanvas()
    {
        if(canvas)
        {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        }
    }

    function initResources()
    {
        if(shader && arrayBuffer)
            return;
        
        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);

        var fragmentSrc = '\
precision mediump float;\n\
varying float alpha;\n\
varying float pointSize;\n\
void main(void)\n\
{\n\
vec2 centerCoord = gl_PointCoord - vec2(0.5);\n\
float radius2 = dot(centerCoord, centerCoord) * 4.0;\n\
float falloff = min(1.0, (1.0 - pow(radius2, 0.125)) * 2.0);\n\
float gray = falloff;\n\
gl_FragColor = mix(vec4(0.5 * (1.0 - smoothstep(0.0, 1.0, radius2))), vec4(gray), clamp(pointSize - 4.0, 0.0, 1.0)) * alpha;\n\
}\n\
';

        var vertexSrc = '\
precision mediump float;\n\
uniform float sprite_scale;\n\
uniform mat4 projection_matrix;\n\
attribute vec4 vertexAttrib;\n\
varying float pointSize;\n\
\n\
varying float alpha;\n\
\n\
void main(void)\n\
{\n\
gl_Position = projection_matrix * vertexAttrib;\n\
gl_PointSize = 1.0 / max(abs(gl_Position[3]), 0.001) * sprite_scale;\n\
pointSize = gl_PointSize;\n\
alpha = clamp(gl_PointSize * 0.9, 0.0, 1.0);\n\
}\
';
        console.info("vertex shader:\n" + vertexSrc);

        gl.shaderSource(fragmentShader, fragmentSrc);
        gl.compileShader(fragmentShader);

        if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
            throw "Fragment shader compilation error: " + gl.getShaderInfoLog(fragmentShader);

        gl.shaderSource(vertexShader, vertexSrc);
        gl.compileShader(vertexShader);

        if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
            throw "Vertex shader compilation error: " + gl.getShaderInfoLog(vertexShader);

        shader = gl.createProgram();
        gl.attachShader(shader, vertexShader);
        gl.attachShader(shader, fragmentShader);
        gl.linkProgram(shader);

        if(!gl.getProgramParameter(shader, gl.LINK_STATUS))
            throw "Shader link error: " + gl.getProgramInfoLog(shader);

        gl.useProgram(shader);
        spriteScaleUniform = gl.getUniformLocation(shader, "sprite_scale");
        projectionMatrixUniform = gl.getUniformLocation(shader, "projection_matrix");
        vertexAttrib = gl.getAttribLocation(shader, "vertexAttrib");
        gl.enableVertexAttribArray(vertexAttrib);

        arrayBuffer = gl.createBuffer();
    }

    function updateStarView(time)
    {
        if(!arrayView)
        {
            var rawBuffer = new ArrayBuffer(numStars * 4 * Float32Array.BYTES_PER_ELEMENT);
            arrayView = new Float32Array(rawBuffer);
        }

        for(var i = 0; i < numStars; ++i)
        {
            var pos = permRand2D(i + time);
            
            var base = i * 4;
            arrayView[base] = pos[0] * xscale; // x
            arrayView[base + 1] = pos[1] * yscale; // y
            arrayView[base + 2] = (-i + (time % 1)) * zscale; // z
            arrayView[base + 3] = 1;
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, arrayView, gl.DYNAMIC_DRAW);
    }


    /////////////////////////////
    // public methods
    /////////////////////////////

    this.render = function()
    {
        try
        {
            // CreateCanvas should already have created gl. If it
            // doesn't exist webgl isn't supported.
            if(!gl) return;

            initResources();

            // update stuff
            var now = new Date().getTime();
            var delta = now - lastTime;
            lastTime = now;

            gl.viewport(0, 0, canvas.width, canvas.height);
            var aspect;
            if(canvas.height == 0)
                aspect = 1;
            else
                aspect = canvas.width / canvas.height;

            gl.depthRange(0, 1);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(shader);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_COLOR, gl.ONE);

            gl.uniformMatrix4fv(projectionMatrixUniform, false, new Float32Array([1,0,0,0, 0,aspect,0,0, 0,0,0,-1, 0,0,2,0]));
            gl.uniform1f(spriteScaleUniform, canvas.width);
            
            updateStarView(now * particleSpeed);

            gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
            gl.vertexAttribPointer(vertexAttrib, 4, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.POINTS, 0, numStars);
        }
        catch(ex)
        {
            console.error(ex);

            // die. we will not try again
            return;
            //throw ex;
        }

        requestAnimationFrame(function(){self.render();});
    };


    ///////////////////////
    // init code
    ///////////////////////

    createCanvas();

    // TODO should append event instead of overwrite?
    if(canvas) window.onresize = resizeCanvas;
}
