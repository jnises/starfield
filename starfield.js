// starfield background

/** @const */
var STARFIELD_DEBUG = false;

// TODO need some export stuff here to work with closure compiler advanced mode
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
    this.numStars = numStars !== undefined ? numStars : 30000;//8192;

    /** @const */
    var xscale = 2048;
    /** @const */
    var yscale = 2048;
    /** @const */
    var zscale = 4096 / this.numStars;

    /** @const */
    var permTableSize = this.numStars;
    var permTable = function()
    {
        var numbers = [];
        for(var i = 0; i < permTableSize; ++i)
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

    //////////////////////////////
    // public data
    //////////////////////////////
    this.gl = null;
    this.lastTime = new Date().getTime();
    this.canvas = null;
    this.shader = null;
    this.projectionMatrixUniform = null;
    this.spriteScaleUniform = null;
    this.particleRadius = 2.0;
    this.particleSpeed = 1.0;
    this.arrayBuffer = null;
    this.arrayView = null;
    this.vertexAttrib = null;


    ///////////////////////////////
    // priviliged methods
    ///////////////////////////////

    /**
     * \return an array of two values between -1 and 1.
     */
    this.permRand2D = function(value)
    {
        var intval = Math.floor(value);

        var x = 2.0 * (permTable[Math.floor(value % permTable.length)] / permTable.length - 0.5);
        var y = 2.0 * (permTable[Math.floor((value + 41241) % permTable.length)] / permTable.length - 0.5);
        return [x, y];
    }

    this.createCanvas = function()
    {
        this.canvas = document.createElement("canvas");
        // TODO handle browsers without canvas support
        if(this.canvas)
        {
            var contextNames = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];
            for(var i = 0; i < contextNames.length; ++i)
            {
                try
                {
                    this.gl = this.canvas.getContext(contextNames[i], {antialias: true});
                }
                catch(e)
                { }

                if(this.gl) break;
            }

            if(this.gl)
            {
                container.appendChild(this.canvas);
                this.resizeCanvas();
            }
        }
    }

    this.resizeCanvas = function()
    {
        if(this.canvas)
        {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }

    this.initResources = function()
    {
        if(this.shader && this.arrayBuffer)
            return;
        
        var fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        var vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);

        var fragmentSrc = '\
precision mediump float;\n\
varying float pointSize;\n\
void main(void)\n\
{\n\
vec2 centerCoord = gl_PointCoord - vec2(0.5);\n\
float radius2 = dot(centerCoord, centerCoord) * 4.0;\n\
float falloff = clamp((1.0 - pow(radius2, 0.125)) * 2.0, 0.0, 1.0);\n\
gl_FragColor = vec4(smoothstep(0.0, 1.0, mix(0.0, mix(mix(0.4, 0.5 * step(-1.0, -radius2), clamp(pointSize - 1.0, 0.0, 1.0)), falloff, clamp(pointSize - 4.0, 0.0, 1.0)), clamp(pointSize * 2.0, 0.0, 1.0))));\n\
}\n\
';

        var vertexSrc = '\
precision mediump float;\n\
uniform float sprite_scale;\n\
uniform mat4 projection_matrix;\n\
attribute vec4 vertexAttrib;\n\
varying float pointSize;\n\
\n\
void main(void)\n\
{\n\
gl_Position = projection_matrix * vertexAttrib;\n\
pointSize = 1.0 / max(abs(gl_Position[3]), 0.0001) * sprite_scale;\n\
gl_PointSize = pointSize;\n\
}\
';
        console.info("vertex shader:\n" + vertexSrc);

        this.gl.shaderSource(fragmentShader, fragmentSrc);
        this.gl.compileShader(fragmentShader);

        if(!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS))
            throw "Fragment shader compilation error: " + this.gl.getShaderInfoLog(fragmentShader);

        this.gl.shaderSource(vertexShader, vertexSrc);
        this.gl.compileShader(vertexShader);

        if(!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS))
            throw "Vertex shader compilation error: " + this.gl.getShaderInfoLog(vertexShader);

        this.shader = this.gl.createProgram();
        this.gl.attachShader(this.shader, vertexShader);
        this.gl.attachShader(this.shader, fragmentShader);
        this.gl.linkProgram(this.shader);

        if(!this.gl.getProgramParameter(this.shader, this.gl.LINK_STATUS))
            throw "Shader link error: " + this.gl.getProgramInfoLog(this.shader);

        this.gl.useProgram(this.shader);
        this.spriteScaleUniform = this.gl.getUniformLocation(this.shader, "sprite_scale");
        this.projectionMatrixUniform = this.gl.getUniformLocation(this.shader, "projection_matrix");
        this.vertexAttrib = this.gl.getAttribLocation(this.shader, "vertexAttrib");
        this.gl.enableVertexAttribArray(this.vertexAttrib);

        this.arrayBuffer = this.gl.createBuffer();
    }

    this.updateStarView = function(time)
    {
        if(!this.arrayView)
        {
            var rawBuffer = new ArrayBuffer(this.numStars * 4 * Float32Array.BYTES_PER_ELEMENT);
            this.arrayView = new Float32Array(rawBuffer);
        }

        for(var i = 0; i < this.numStars; ++i)
        {
            var pos = this.permRand2D(i + time);
            
            var base = i * 4;
            this.arrayView[base] = pos[0] * xscale; // x
            this.arrayView[base + 1] = pos[1] * yscale; // y
            this.arrayView[base + 2] = (-i + (time % 1)) * zscale; // z
            this.arrayView[base + 3] = 1;
        }
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.arrayBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.arrayView, this.gl.DYNAMIC_DRAW);
    }

    ///////////////////////
    // init code
    ///////////////////////

    this.createCanvas();

    // TODO should append event instead of overwrite?
    if(this.canvas) window.onresize = this.resizeCanvas;
}

Starfield.prototype.render = function()
{
    var self = this;
    try
    {
        // CreateCanvas should already have created gl. If it
        // doesn't exist webgl isn't supported.
        if(!this.gl) return;

        this.initResources();

        // update stuff
        var now = new Date().getTime();
        var delta = now - this.lastTime;
        this.lastTime = now;

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        var aspect;
        if(this.canvas.height == 0)
            aspect = 1;
        else
            aspect = this.canvas.width / this.canvas.height;

        this.gl.depthRange(0, 1);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.shader);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_COLOR, this.gl.ONE);

        this.gl.uniformMatrix4fv(this.projectionMatrixUniform, false, new Float32Array([1,0,0,0, 0,aspect,0,0, 0,0,0,-1, 0,0,2,0]));
        this.gl.uniform1f(this.spriteScaleUniform, this.canvas.width * this.particleRadius);
        
        this.updateStarView(now * this.particleSpeed);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.arrayBuffer);
        this.gl.vertexAttribPointer(this.vertexAttrib, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.POINTS, 0, this.numStars);
    }
    catch(ex)
    {
        if(STARFIELD_DEBUG)
            throw ex;
        else
            // die. we will not try again
            return;
    }

    requestAnimationFrame(function(){self.render();});
};

// export to be able to use closure compiler advanced mode
window['Starfield'] = Starfield;
Starfield.prototype['render'] = Starfield.prototype.render;
