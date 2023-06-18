import * as THREE from '../99_Lib/three.module.min.js';
import { createVRcontrollers } from './vr.mjs';


export function createLine(scene) {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(0, 1, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    const position = line.geometry.attributes.position.array;

    return (idx, pos) => {
        idx *= 3;
        position[idx++] = pos.x;
        position[idx++] = pos.y;
        position[idx++] = pos.z;
        line.geometry.attributes.position.needsUpdate = true;
    }
}

export function cursorballinteractions(renderer, scene, cursor, ball) {

    //controller position (raycast start)
    let position = new THREE.Vector3(0, -10, 0);
    let rotation = new THREE.Quaternion();
    let scale = new THREE.Vector3();

    let ballGrabbed = false;
    let grabbed = false;

    let last_active_controller, last_active_inputsource;
    let { controller1, controller2 } = createVRcontrollers(scene, renderer, (current, src) => {
        // called if/when controllers connect
        cursor.matrixAutoUpdate = false;
        cursor.visible = false;
        last_active_controller = current;
        last_active_inputsource = src;
        console.log(`connected ${src.handedness} device`);
        renderer.xr.enabled = true;
    });

    function update() {
        if (last_active_controller) {
            cursor.matrix.copy(last_active_controller.matrix);
            grabbed = controller1.controller.userData.isSelecting || controller2.controller.userData.isSelecting;
        } else {
            cursor.updateMatrix();
        }
        cursor.matrix.decompose(position, rotation, scale);


        if (grabbed && position.distanceTo(ball.position) < 0.3) {
            ballGrabbed = true;
            ball.matrix.copy(cursor.matrix.clone());
        } else if (grabbed && ballGrabbed) {
            ball.matrix.copy(cursor.matrix.clone());
        } else {
            ballGrabbed = false;
        }
    }
    return { update };
}