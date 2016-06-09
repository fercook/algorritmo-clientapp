var ParticleManager = {};

//Constants defining the size of the 3d area recorded by the three.js camera.
ParticleManager.CANVAS_WIDTH = 50;
ParticleManager.CANVAS_HEIGHT = 50;

ParticleManager.safeZoneOptions = {
    position: new THREE.Vector3(0, 0, 0),
    positionRandomness: 1.79,
    velocity: new THREE.Vector3(),
    velocityRandomness: 1.27,
    color: 0xa3a097,
    colorRandomness: 1,
    turbulence: 0,
    lifetime: 0.1,
    size: 14,
    sizeRandomness: 25
};

/**
 * Initial coordinates for the particle system. Pointing to a position out of
 * camera where the user cannot see it.
 * @type {[type]}
 */
ParticleManager.HIDDEN_X = -100;
ParticleManager.HIDDEN_Y = -100;


ParticleManager.playOptions = {
    position: new THREE.Vector3(0, 0, 0),
    positionRandomness: 2.11,
    velocity: new THREE.Vector3(),
    velocityRandomness: 1.5,
    color: 0x000000,
    colorRandomness: 0,
    turbulence: 1,
    lifetime: 2.5,
    size: 6,
    sizeRandomness: 25
};

ParticleManager.stopOptions = {
    position: new THREE.Vector3(0, 0, 0),
    positionRandomness: 0.55,
    velocity: new THREE.Vector3(),
    velocityRandomness: 2.31,
    color: 0x000000,
    colorRandomness: 1,
    turbulence: 0,
    lifetime: 1.1,
    size: 14,
    sizeRandomness: 25
};

ParticleManager.safeZoneSpawnerOptions = {
    spawnRate: 10,
    horizontalSpeed: 1.5,
    verticalSpeed: 1.33,
    timeScale: 0.2
};

ParticleManager.playSpawnerOptions = {
    spawnRate: 15035,
    horizontalSpeed: 1.5,
    verticalSpeed: 1.33,
    timeScale: 0.6
};

ParticleManager.stopSpawnerOptions = {
    spawnRate: 10,
    horizontalSpeed: 1.5,
    verticalSpeed: 1.33,
    timeScale: 0.4
};

//Constants used to determine on which state is the user.
ParticleManager.ON_SAFE_ZONE = 0;
ParticleManager.PLAYING = 1;
ParticleManager.STOPPED = 2;

ParticleManager.userState = undefined;

ParticleManager.stateOptions = {};
ParticleManager.stateOptions[ParticleManager.ON_SAFE_ZONE] = ParticleManager.safeZoneOptions;
ParticleManager.stateOptions[ParticleManager.PLAYING] = ParticleManager.playOptions;
ParticleManager.stateOptions[ParticleManager.STOPPED] = ParticleManager.stopOptions;

ParticleManager.stateSpawnOptions = {};
ParticleManager.stateSpawnOptions[ParticleManager.ON_SAFE_ZONE] = ParticleManager.safeZoneSpawnerOptions;
ParticleManager.stateSpawnOptions[ParticleManager.PLAYING] = ParticleManager.playSpawnerOptions;
ParticleManager.stateSpawnOptions[ParticleManager.STOPPED] = ParticleManager.stopSpawnerOptions;

ParticleManager.copyJson = function(jsonObject) {
    return JSON.parse(JSON.stringify(jsonObject));
};

ParticleManager.getCurrentStateOptions = function() {
    return ParticleManager.copyJson(ParticleManager.stateOptions[ParticleManager.userState.state]);
};

ParticleManager.getCurrentSpawnStateOptions = function() {
    return ParticleManager.copyJson(ParticleManager.stateSpawnOptions[ParticleManager.userState.state]);
};

ParticleManager.loadCanvasParticles = function() {
        var camera, tick = 0,
            scene, renderer, clock = new THREE.Clock(true), container,
            options, spawnerOptions, particleSystem;
        var mousePos;
        //Initialize user information.
        this.clearUserInformation();
        init();
        animate();
        function init() {
            container = d3.select("body").append('div')
                .attr("class", "canvas-container")
                .style("top", (window.innerHeight - MakerViz.PLAYAREA_HEIGHT) + "px");
            camera = new THREE.OrthographicCamera(ParticleManager.CANVAS_WIDTH / - 2, ParticleManager.CANVAS_WIDTH / 2, ParticleManager.CANVAS_HEIGHT / - 2, ParticleManager.CANVAS_HEIGHT / 2, 1, 10000);
            camera.position.z = 100;
            scene = new THREE.Scene();
            // The GPU Particle system extends THREE.Object3D, and so you can use it
            // as you would any other scene graph component.    Particle positions will be
            // relative to the position of the particle system, but you will probably only need one
            // system for your whole scene.
            particleSystem = new THREE.GPUParticleSystem({
                maxParticles: 250000
            });
            scene.add( particleSystem);
            //options passed during each spawned
            options = ParticleManager.getCurrentStateOptions();
            spawnerOptions = ParticleManager.getCurrentSpawnStateOptions();

            renderer = new THREE.WebGLRenderer({ alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, MakerViz.PLAYAREA_HEIGHT);
            container[0][0].appendChild(renderer.domElement);

            window.addEventListener('resize', onWindowResize, false);
        }
        function onWindowResize() {
            //TODO: Check if it is done correctly.
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
        function animate() {
            requestAnimationFrame(animate);

            options = ParticleManager.getCurrentStateOptions();
            spawnerOptions = ParticleManager.getCurrentSpawnStateOptions();

            var delta = clock.getDelta() * spawnerOptions.timeScale;
            tick += delta;
            if (tick < 0) tick = 0;
            if (delta > 0) {
                options.position.x = (ParticleManager.userState.position[0]*ParticleManager.CANVAS_WIDTH/window.innerWidth) - ParticleManager.CANVAS_WIDTH/2;
                options.position.y = (ParticleManager.userState.position[1]*ParticleManager.CANVAS_HEIGHT/MakerViz.PLAYAREA_HEIGHT) - ParticleManager.CANVAS_HEIGHT/2;
                options.position.z = 0;
                options.color = LeapManager.INSTRUMENT_LIST[ParticleManager.userState.instrumentIndex].color;
                options.color = LeapManager.hashToHexadecimal(options.color);
                for (var x = 0; x < spawnerOptions.spawnRate * delta; x++) {
                    // Yep, that's really it.   Spawning particles is super cheap, and once you spawn them, the rest of
                    // their lifecycle is handled entirely on the GPU, driven by a time uniform updated below
                    particleSystem.spawnParticle(options);
                }
            }
            particleSystem.update(tick);
            render();
        }
        function render() {
            renderer.render(scene, camera);
        }
}

ParticleManager.updateUserInformation = function(newX, newY, newState, instIndex) {
    ParticleManager.userState = {
        position: [newX, newY, 0],
        instrumentIndex: instIndex,
        state:  newState
    };
}

ParticleManager.clearUserInformation = function() {
    ParticleManager.userState = {
        position: [ParticleManager.HIDDEN_X, ParticleManager.HIDDEN_Y, 0],
        instrumentIndex: 0,
        state:  ParticleManager.STOPPED
    };
}