// starfield background
// depends on three.js

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

function Starfield(container, numStars)
{
    var self = this;
    var lastTime = new Date().getTime();
    numStars = numStars !== undefined ? numStars : 2048;

    var zspan = [2048, 1];
    var xspan = [-1024, 1024];
    var yspan = [-1024, 1024];

    var particleRadius = 0.5;
    var particleVariance = 0.5;
    var particleSpeed = 0.1;

    var stars = [];
	
    var camera = new THREE.Camera(120, container.clientWidth / container.clientHeight, zspan[1], zspan[0]);
    camera.position.z = zspan[0];
    var renderer = new THREE.CanvasRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    window.onresize = function()
    {
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    };
    container.appendChild(renderer.domElement);


    this.render = function()
    {
        requestAnimationFrame(function()
                              {
                                  self.render();
                              });

        // update stuff
        var now = new Date().getTime();
        var delta = now - lastTime;
        lastTime = now;


        for(var i = 0; i < stars.length; ++i)
            stars[i].position.z += delta * particleSpeed;

        // TODO also cull stars that go outside of the view frustum
        while(stars.length && stars[0].position.z > zspan[0])
            stars.shift();

        if(stars.length < numStars)
        {
            // spawn one star per render loop
            var particle = new THREE.Particle(new THREE.ParticleCanvasMaterial(
                {color: 0xffffff,
                 program: function(context)
                 {
                     // change to some radial gradient
					 context.beginPath();
					 context.arc( 0, 0, 1, 0, 7, true );
					 context.closePath();
					 context.fill();                     
                 }}));
            particle.scale.x = particle.scale.y = Math.random() * particleVariance + particleRadius;
            particle.position.x = Math.random() * (xspan[1] - xspan[0]) + xspan[0];
            particle.position.y = Math.random() * (yspan[1] - yspan[0]) + yspan[0];
            particle.position.z = zspan[1];
            stars.push(particle);
        }

        // render stuff
        var scene = new THREE.Scene();
        for(var i = 0; i < stars.length; ++i)
            scene.addChild(stars[i]);

        renderer.render(scene, camera);
    };
}
