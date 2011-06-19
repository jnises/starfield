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
    numStars = numStars !== undefined ? numStars : 2048;

    var zspan = [2048, 1];
    var xspan = [-1024, 1024];
    var yspan = [-1024, 1024];

    var particleRadius = 0.5;
    var particleVariance = 0.5;
    var particleSpeed = 0.1;

    var arrayBuffer = null;
    var arrayView = null;

    var canvas = null;
    var gl = null;

    var shader = null;
    var projectionMatrixUniform = null;
    var vertexAttribUniform = null;

    // TODO this won't work, webgl glsl doesn't support integers it seems
    var permString = function()
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

        return "const int perm[256] = int[](" + perm.join(",") + ");";
    }();


    ///////////////////////////////
    // private methods
    ///////////////////////////////

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
                    gl = canvas.getContext(contextNames[i]);
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

            if(gl) 
            {
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
        }
    }

    function initResources()
    {
        if(shader && arrayBuffer)
            return;
        
        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);

        var fragmentSrc = '\
void main(void)\n\
{\n\
gl_FragColor = vec4(1,1,1,1);\n\
}\n\
';

        var vertexSrc = permString + '\n\
uniform mat4 projection_matrix;\n\
attribute vec4 vertexAttrib;\n\
void main(void)\n\
{\n\
gl_Position = vec4(0.0, 0.0, -10.0, 1.0);\n\
gl_PointSize = 10.0;\n\
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
        projectionMatrixUniform = gl.getAttribLocation(shader, "projection_matrix");

        vertexAttribUniform = gl.getAttribLocation(shader, "vertexAttrib");
        gl.enableVertexAttribArray(vertexAttribUniform);
        arrayBuffer = gl.createBuffer();
    }

    function updateStarView(time)
    {
        if(!arrayView)
        {
            var rawBuffer = new ArrayBuffer(numStars * 4 * Float32Array.BYTES_PER_ELEMENT);
            arrayView = new Float32Array(rawBuffer);
        }

        // TODO update the star view
        for(var i = 0; i < numStars; ++i)
        {

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
            if(!gl) return;

            initResources();

            // update stuff
            var now = new Date().getTime();
            var delta = now - lastTime;
            lastTime = now;

            gl.depthRange(0, 1);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(shader);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_COLOR, gl.ONE);

            // TODO use a better matrix
            gl.uniformMatrix4fv(projectionMatrixUniform, false, [1,0,0,0, 0,1,0,0, 0,0,0,-1, 0,0,2,0]);
            
            updateStarView(now);

            gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
            gl.vertexAttribPointer(vertexAttribUniform, 4, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.POINTS, 0, numStars);
        }
        catch(ex)
        {
            console.error(ex);

            // die. we will not try again
            return;
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
