// import * as THREE from '../99_Lib/three.module.min.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { mousecursor } from './mousecursor.mjs';
import { cursorballinteractions } from './cursorballevents.mjs';

console.log("ThreeJs with VR ", THREE.REVISION, new Date());

function randomMaterial() {
    return new THREE.MeshStandardMaterial({
        color: Math.random() * 0xff3333,
        roughness: 0.7,
        metalness: 0.0
    });
}

function add(geo, parent, x = 0, y = 0, z = 0) {
    let object = new THREE.Mesh(geo, randomMaterial());
    object.position.set(x, y, z);
    object.updateMatrix();
    object.matrixAutoUpdate = false;
    parent.add(object);
    return object;
}

window.onload = function () {
    let scene = new THREE.Scene();

    scene.add(new THREE.HemisphereLight(0x808080, 0x606060));
    let light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 2, 0);
    scene.add(light);

    let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 1);
    scene.add(camera);


    let cursorgeo = new THREE.ConeGeometry(0.1, 0.4, 64);
    let cursor = add(cursorgeo, scene);
    mousecursor(cursor);

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
