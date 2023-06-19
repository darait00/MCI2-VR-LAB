// import * as THREE from '../99_Lib/three.module.min.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { AmmoPhysics } from 'three/addons/physics/AmmoPhysics.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mousecursor } from './mousecursor.mjs';
import { cursorballinteractions } from './cursorballevents.mjs';

console.log("ThreeJs with VR ", THREE.REVISION, new Date());

let physics;

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

window.onload = async function () {
    let scene = new THREE.Scene();
    const loader = new GLTFLoader();
    //physics = await AmmoPhysics(); // Physics

    // Sky & Light
        scene.add(new THREE.HemisphereLight(0x808080, 0x606060));
        let light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 2, 0);
        scene.add(light);
        //skybox
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
    //

    //Floor
    const geometry = new THREE.PlaneGeometry( 10, 10 );
    const material = new THREE.MeshBasicMaterial( {color: 0x434343, side: THREE.DoubleSide} );
    const floor = new THREE.Mesh( geometry, material );
    floor.rotation.set(Math.PI/2,0,0)
    floor.visible=true;
    floor.receiveShadow = true;
    //physics.addMesh(floor);
    scene.add(floor);
    //Grid
    var grid = new THREE.GridHelper(10, 10);
    scene.add(grid);

    let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 1);
    scene.add(camera);

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


    let targetshelf = new THREE.BoxGeometry(2, 1.5, .75);
    let shelf = add(targetshelf, scene, 0, 0, -5);

    let ballgeo = new THREE.IcosahedronGeometry(0.05, 3);
    let ball = add(ballgeo, scene, 0, 1, -0.5);

    let renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xaaaaaa, 1);

    document.body.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer));


    let ballinteractions = cursorballinteractions(renderer, scene, cursor, ball);
    function render() {
        ball.position.setFromMatrixPosition(ball.matrix);
        ballinteractions.update();
        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);
};
