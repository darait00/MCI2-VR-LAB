// import * as THREE from '../99_Lib/three.module.min.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mousecursor } from './mousecursor.mjs';
import { cursorballinteractions } from './cursorballevents.mjs';

console.debug("ThreeJs with VR ", THREE.REVISION, new Date());

let physicsWorld, scene, camera, renderer, clock, ballinteractions;
let rigidBodies = [], tmpTrans, debugDrawer;


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
        'models/gltf/' + model + '.gltf',
        // called when the resource is loaded
        function (gltf) {
            const model = gltf.scene; // THREE.Group
            gltf.scene.traverse(function (node) {

                if (node.isMesh) { node.castShadow = true; }
                if (node.isMesh || node.isLight) node.receiveShadow = true;

            });
            model.position.setX(x);
            model.position.setY(y);
            model.position.setZ(z);
            model.scale.multiplyScalar(2);
            scene.add(gltf.scene);

        },
        // called while loading is progressing
        function (xhr) {

            console.log((xhr.loaded / xhr.total * 100) + '% loaded');

        },
        // called when loading has errors
        function (error) {

            console.log('An error happened');

        }
    );
}

window.onload = function () {
    Ammo().then(start);
}

function setupGraphics() {
    //create clock for timing
    clock = new THREE.Clock();

    //create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);

    //create the Model loader
    const loader = new GLTFLoader();

    //create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1, 2);
    scene.add(camera);

    //Add hemisphere light
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
    hemiLight.color.setHSL(0.6, 0.6, 0.6);
    hemiLight.groundColor.setHSL(0.1, 1, 0.4);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    const light = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(light);

    //Add directional light
    let dirLight = new THREE.DirectionalLight(0x9a5000, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(-1, 1.75, 1);
    dirLight.position.multiplyScalar(100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    let d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 13500;
    scene.add(dirLight);

    // Skybox
    let skyGeo = new THREE.SphereGeometry(50, 24, 24);
    var texloader = new THREE.TextureLoader(),
        texture = texloader.load("./images/skybox.jpg");
    var skymat = new THREE.MeshBasicMaterial({
        map: texture, // This will be used as the base texture
        emissiveMap: texture // Use the same texture as emissive map
    });
    var sky = new THREE.Mesh(skyGeo, skymat);
    sky.rotation.set(0, -Math.PI / 1.75, 0)
    sky.material.side = THREE.BackSide;
    scene.add(sky);

    createGround();

    let cursorgeo = new THREE.ConeGeometry(0.1, 0.4, 64);
    let cursor = add(cursorgeo, scene);
    mousecursor(cursor);

    //Cans
    const canPos = [
        { x: -.3, y: .75, z: -3 },
        { x: -.1, y: .75, z: -3 },
        { x: .1, y: .75, z: -3 },
        { x: .3, y: .75, z: -3 },
        { x: -.2, y: 1, z: -3 },
        { x: 0, y: 1, z: -3 },
        { x: .2, y: 1, z: -3 },
        { x: -.1, y: 1.19, z: -3 },
        { x: .1, y: 1.19, z: -3 },
        { x: 0, y: 1.41, z: -3 }
    ];
    canPos.forEach(async (pos) => {
        await createCan(loader, pos.x, pos.y, pos.z)
    });

    // Shelf under cans
    createShelf();

    // Ball
    //let ballgeo = new THREE.IcosahedronGeometry(0.05, 3);
    //ball = add(ballgeo, scene, 0, 3, -0.5);
    let ballobj = createBall();
    let ball = ballobj.ballmesh;
    let ballbody = ballobj.body;

    //
    createBallBox();
    // Create an invisible box
    const geometry = new THREE.BoxGeometry(3, 5, 10); // Dimensions of the box
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const invisibleBox = new THREE.Mesh(geometry, material);
    invisibleBox.position.set(0, 0, -2.5);
    invisibleBox.visible = false; // Make the box invisible
    scene.add(invisibleBox);

    // Create a bounding box from the invisible box
    const boundingBox = new THREE.Box3().setFromObject(invisibleBox);

    // Function to check if an object is inside the bounding box
    function isInsideBoundingBox(object) {
        const objectBoundingBox = new THREE.Box3().setFromObject(object);
        return boundingBox.intersectsBox(objectBoundingBox);
    }
    setInterval(() => {
        if (isInsideBoundingBox(ball)) {
            //console.log("The object is inside the invisible box");
        } else {
            //console.log("The object is outside the invisible box");
            scene.remove(ball);
            physicsWorld.removeRigidBody(ballbody);
            const index = rigidBodies.indexOf(ball);
            // Remove the ball mesh from the rigidBodies array
            if (index > -1) {
                rigidBodies.splice(index, 1);
            }
            ballobj = createBall();
            ball = ballobj.ballmesh;
            ballbody = ballobj.body;

            ballinteractions = cursorballinteractions(renderer, scene, cursor, ball, ballbody);
        }
    }, 1000);

    //Setup the renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    renderer.setClearColor(0xbfd1e5, 1);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;
    document.body.appendChild(VRButton.createButton(renderer));

    ballinteractions = cursorballinteractions(renderer, scene, cursor, ball, ballbody, createBall);

    function render() {
        let deltaTime = clock.getDelta();
        ball.position.setFromMatrixPosition(ball.matrix);
        ballinteractions.update(deltaTime);
        updatePhysics(deltaTime);

        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);
}

function renderFrame() {

    let deltaTime = clock.getDelta();

    updatePhysics(deltaTime);

    renderer.render(scene, camera);

    requestAnimationFrame(renderFrame);

}

// Create Physical Models
async function createCan(loader, x, y, z) {

    let pos = { x: x, y: y, z: z };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 1;

    //threeJS Section
    await loader.load(
        // resource URL
        'models/gltf/scene.gltf',
        // called when the resource is loaded
        function (gltf) {
            const model = gltf.scene; // THREE.Group
            gltf.scene.traverse(function (node) {

                if (node.isMesh) { node.castShadow = true; }
                if (node.isMesh || node.isLight) node.receiveShadow = true;

            });
            model.position.setX(pos.x);
            model.position.setY(pos.y);
            model.position.setZ(pos.z);
            model.scale.multiplyScalar(2);
            scene.add(gltf.scene);

            // Ammo.js Section
            const startTransform = new Ammo.btTransform();
            startTransform.setIdentity();
            startTransform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
            const cylinderQuat = new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w);
            startTransform.setRotation(cylinderQuat);

            const cylinderShape = new Ammo.btCylinderShape(new Ammo.btVector3(0.08, 0.105, 0.025));
            const localInertia = new Ammo.btVector3(0, 0, 0);
            cylinderShape.calculateLocalInertia(mass, localInertia);

            const motionState = new Ammo.btDefaultMotionState(startTransform);
            const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, cylinderShape, localInertia);
            const cylinderBody = new Ammo.btRigidBody(rbInfo);

            physicsWorld.addRigidBody(cylinderBody);

            model.userData.physicsBody = cylinderBody;
            rigidBodies.push(model);
        }
    );
}

function createBall() {
    let pos = { x: .5, y: 1.05, z: -.5 };
    let radius = 0.05;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 1;

    //threeJS Section
    let ballmesh = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial({ color: 0xff0505 }));

    ballmesh.position.set(pos.x, pos.y, pos.z);

    ballmesh.castShadow = true;
    ballmesh.receiveShadow = true;

    scene.add(ballmesh);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.01);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    ballmesh.userData.physicsBody = body;
    rigidBodies.push(ballmesh);
    return { ballmesh, body };
}

function createGround() {
    var grid = new THREE.GridHelper(15, 15);
    scene.add(grid);
    const groundGeometry = new THREE.PlaneGeometry(15, 15);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x434343, side: THREE.DoubleSide }); // Green color
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2; // Rotate the ground to be horizontal
    scene.add(groundMesh);

    const groundTransform = new Ammo.btTransform();
    groundTransform.setIdentity();
    groundTransform.setOrigin(new Ammo.btVector3(0, 0, 0)); // Position of the ground plane
    const groundMass = 0; // Setting the mass to 0 makes it static
    const groundLocalInertia = new Ammo.btVector3(0, 0, 0);
    const groundShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(0, 1, 0), 0);
    groundShape.calculateLocalInertia(groundMass, groundLocalInertia);
    const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
    const groundRigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(groundMass, groundMotionState, groundShape, groundLocalInertia);
    const groundRigidBody = new Ammo.btRigidBody(groundRigidBodyInfo);
    physicsWorld.addRigidBody(groundRigidBody);
}

function createShelf() {
    let targetshelf = new THREE.BoxGeometry(2, 1.55, .75);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x434343, side: THREE.DoubleSide }); // Green color
    let shelf = new THREE.Mesh(targetshelf, groundMaterial);
    shelf.position.set(0, 0, -3);
    shelf.updateMatrix();
    shelf.matrixAutoUpdate = false;
    scene.add(shelf)

    const shelfTransform = new Ammo.btTransform();
    shelfTransform.setIdentity();
    shelfTransform.setOrigin(new Ammo.btVector3(0, 0, -3)); // Position of the shelf plane
    const shelfMass = 0; // Setting the mass to 0 makes it static
    const shelfLocalInertia = new Ammo.btVector3(0, 0, 0);
    const shelfShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 0.675, 0.375));
    shelfShape.calculateLocalInertia(shelfMass, shelfLocalInertia);
    const shelfMotionState = new Ammo.btDefaultMotionState(shelfTransform);
    const shelfRigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(shelfMass, shelfMotionState, shelfShape, shelfLocalInertia);
    const shelfRigidBody = new Ammo.btRigidBody(shelfRigidBodyInfo);
    physicsWorld.addRigidBody(shelfRigidBody);
}

function createBallBox() {
    let targetshelf = new THREE.BoxGeometry(.5, 1.5, .5);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x434343, side: THREE.DoubleSide }); // Green color
    let shelf = new THREE.Mesh(targetshelf, groundMaterial);
    shelf.position.set(.5, 0, -.5);
    shelf.updateMatrix();
    shelf.matrixAutoUpdate = false;
    scene.add(shelf)

    const shelfTransform = new Ammo.btTransform();
    shelfTransform.setIdentity();
    shelfTransform.setOrigin(new Ammo.btVector3(.5, 0, -.5)); // Position of the shelf plane
    const shelfMass = 0; // Setting the mass to 0 makes it static
    const shelfLocalInertia = new Ammo.btVector3(0, 0, 0);
    const shelfShape = new Ammo.btBoxShape(new Ammo.btVector3(.25, 0.7475, .25));
    shelfShape.calculateLocalInertia(shelfMass, shelfLocalInertia);
    const shelfMotionState = new Ammo.btDefaultMotionState(shelfTransform);
    const shelfRigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(shelfMass, shelfMotionState, shelfShape, shelfLocalInertia);
    const shelfRigidBody = new Ammo.btRigidBody(shelfRigidBodyInfo);
    physicsWorld.addRigidBody(shelfRigidBody);
}

// Game Mechanics
function setupPhysicsWorld() {

    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -9.81, 0));
}

function updatePhysics(deltaTime) {

    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid bodies
    for (let i = 0; i < rigidBodies.length; i++) {
        let objThree = rigidBodies[i];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();

        if (objThree.userData.isBeingGrabbed) continue;

        if (ms) {
            ms.getWorldTransform(tmpTrans);
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

        }
    }

}

function start() {
    tmpTrans = new Ammo.btTransform();
    setupPhysicsWorld();
    setupGraphics();
};