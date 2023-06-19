// import * as THREE from '../99_Lib/three.module.min.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mousecursor } from './mousecursor.mjs';
import { cursorballinteractions } from './cursorballevents.mjs';

console.debug("ThreeJs with VR ", THREE.REVISION, new Date());

let physicsWorld, scene, camera, renderer, ball, ballinteractions, clock;
let rigidBodies = [], tmpTrans;

function randomMaterial() {
    return new THREE.MeshStandardMaterial({
        color: Math.random() * 0xff3333,
        roughness: 0.7,
        metalness: 0.0,
        side: THREE.DoubleSide
    });
}

function add(geo, parent, x = 0, y = 0, z = 0) {
    const material = new THREE.ShadowMaterial();
    material.opacity = 0.2;
    let object = new THREE.Mesh(geo, randomMaterial());
    object.receiveShadow = true;
    object.position.set(x, y, z);
    object.updateMatrix();
    object.matrixAutoUpdate = false;
    parent.add(object);
    return object;
}

function add3dmodel(scene, loader, model, x = 0, y = 0, z = 0) {
    loader.load(
        // resource URL
        'models/gltf/'+model+'.gltf',
        // called when the resource is loaded
        function ( gltf ) {
            const model = gltf.scene; // THREE.Group
            gltf.scene.traverse( function( node ) {

                if ( node.isMesh ) { node.castShadow = true; }
                if ( node.isMesh || node.isLight ) node.receiveShadow = true;
        
            } );
            model.position.setX(x);
            model.position.setY(y);
            model.position.setZ(z);
            model.scale.multiplyScalar(2);
            scene.add( gltf.scene );
    
        },
        // called while loading is progressing
        function ( xhr ) {
    
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    
        },
        // called when loading has errors
        function ( error ) {
    
            console.log( 'An error happened' );
    
        }
    );
}

window.onload = function(){
    Ammo().then( start );
}

function setupGraphics(){
    //create clock for timing
    clock = new THREE.Clock();
    
    //create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xbfd1e5 );

    //create the Model loader
    const loader = new GLTFLoader();

    //create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 1);
    scene.add(camera);

    //Add hemisphere light
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 );
    hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
    hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );

    //Add directional light
    let dirLight = new THREE.DirectionalLight( 0xffffff , 1);
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( -1, 1.75, 1 );
    dirLight.position.multiplyScalar( 100 );
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    let d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 13500;
    scene.add( dirLight );

    // Skybox
    var skyGeo = new THREE.SphereGeometry(50, 25, 25); 
    var texloader  = new THREE.TextureLoader(),
    texture = texloader.load( "./images/skybox.jpg" );
    var skymat = new THREE.MeshPhongMaterial({ 
        map: texture,
    });
    var sky = new THREE.Mesh(skyGeo, skymat);
    sky.rotation.set(0,-Math.PI/1.75,0)
    sky.material.side = THREE.BackSide;
    scene.add(sky);

    // Sky & Light & Floor
        
        // Floor
        const geometry = new THREE.PlaneGeometry( 10, 10 );
        const material = new THREE.MeshBasicMaterial( {color: 0x434343, side: THREE.DoubleSide} );
        const floor = new THREE.Mesh( geometry, material );
        floor.rotation.set(Math.PI/2,0,0)
        floor.visible=true;
        floor.receiveShadow = true;
        scene.add(floor);
        // Grid
        var grid = new THREE.GridHelper(10, 10);
        scene.add(grid);
    //


    let cursorgeo = new THREE.ConeGeometry(0.1, 0.4, 64);
    let cursor = add(cursorgeo, scene);
    mousecursor(cursor);

    //Cans
    // first row
    add3dmodel(scene, loader, 'scene', -.3, .75, -5);
    add3dmodel(scene, loader, 'scene', -.1, .75, -5);
    add3dmodel(scene, loader, 'scene', .1, .75, -5);
    add3dmodel(scene, loader, 'scene', .3, .75, -5);
    // second row
    add3dmodel(scene, loader, 'scene', -.2, .97, -5);
    add3dmodel(scene, loader, 'scene', 0, .97, -5);
    add3dmodel(scene, loader, 'scene', .2, .97, -5);
    // second row
    add3dmodel(scene, loader, 'scene', -.1, 1.19, -5);
    add3dmodel(scene, loader, 'scene', .1, 1.19, -5);
    // second row
    add3dmodel(scene, loader, 'scene', 0, 1.41, -5);


    // Shelf under cans
    let targetshelf = new THREE.BoxGeometry(2, 1.5, .75);
    let shelf = add(targetshelf, scene, 0, 0, -5);
    // Ball
    let ballgeo = new THREE.IcosahedronGeometry(0.05, 3);
    ball = add(ballgeo, scene, 0, 1, -0.5);

    createBlock();
    createBall();

    //Setup the renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    renderer.setClearColor( 0xbfd1e5, 1 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;
    document.body.appendChild(VRButton.createButton(renderer));


    ballinteractions = cursorballinteractions(renderer, scene, cursor, ball);
    
    function render() {
        let deltaTime = clock.getDelta();
        ball.position.setFromMatrixPosition(ball.matrix);
        ballinteractions.update();
        updatePhysics( deltaTime );
        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);
}

function renderFrame(){

    let deltaTime = clock.getDelta();

    updatePhysics( deltaTime );

    renderer.render( scene, camera );

    requestAnimationFrame( renderFrame );

}

function createBall(){
    
    let pos = {x: 0, y: 20, z: 0};
    let radius = 2;
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    //threeJS Section
    let ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 3), new THREE.MeshPhongMaterial({color: 0xff0505}));

    ball.position.set(pos.x, pos.y, pos.z);
    
    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btSphereShape( radius );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );


    physicsWorld.addRigidBody( body );
    
    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
}

function createBlock(){
                
    let pos = {x: 0, y: 0, z: 0};
    let scale = {x: 50, y: 2, z: 50};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    //threeJS Section
    let blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));

    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.scale.set(scale.x, scale.y, scale.z);

    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;

    scene.add(blockPlane);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );


    physicsWorld.addRigidBody( body, 1, 2 );
}


function setupPhysicsWorld(){

    let collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache    = new Ammo.btDbvtBroadphase(),
        solver                  = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld           = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

}

function updatePhysics( deltaTime ){

    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 );

    // Update rigid bodies
    for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {

            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

        }
    }

}

function start() {
    tmpTrans = new Ammo.btTransform();
    setupPhysicsWorld();
    setupGraphics();
};
