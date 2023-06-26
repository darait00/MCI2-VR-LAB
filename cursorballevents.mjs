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

export function cursorballinteractions(renderer, scene, cursor, ball, rdgbody) {

    //controller position (raycast start)
    let position = new THREE.Vector3(0, -10, 0);
    let rotation = new THREE.Quaternion();
    let scale = new THREE.Vector3();

    let ballGrabbed = false;
    let grabbed = false;

    //Motion
    let ballPhysicsBody = rdgbody; // Ammo.js rigid body of the ball
    let transform = new Ammo.btTransform();
    let tempMatrix = new THREE.Matrix4(); // Temporary THREE.Matrix4 for calculations
    let prevPosition = new THREE.Vector3();


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

    function snapBallToCursor() {
        // Update the position of the ball's physics body to follow the controller using matrices
        tempMatrix.copy(cursor.matrix.clone()); // Copy the controller's matrix

        ball.matrix.copy(cursor.matrix.clone());
        ball.matrix.decompose(ball.position, ball.quaternion, ball.scale);

        // Extract position and quaternion from the matrix
        let pos = new THREE.Vector3();
        let quat = new THREE.Quaternion();
        pos.setFromMatrixPosition(tempMatrix);
        quat.setFromRotationMatrix(tempMatrix);

        // Update Ammo.js transform
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        ballPhysicsBody.setWorldTransform(transform);
        ballPhysicsBody.setActivationState(4); // Prevent the ball from deactivating
        ball.userData.isBeingGrabbed = true;
    }

    function update(deltaTime) {

        if (last_active_controller) {
            cursor.matrix.copy(last_active_controller.matrix);
            grabbed = controller1.controller.userData.isSqueezeing || controller2.controller.userData.isSqueezeing;
        } else {
            cursor.updateMatrix();
        }
        cursor.matrix.decompose(position, rotation, scale);


        if (grabbed && ballGrabbed) {
            console.log("ball grabbed");
            //ball.matrix.copy(cursor.matrix.clone());
            snapBallToCursor();
            // Added Throwing logic

            //let deltaTime = new THREE.Clock().getDelta();
            let velocity = position.clone().sub(prevPosition).divideScalar(deltaTime);

            if (velocity.length() > 2) {
                console.log("Throw motion recognized" + console.log(velocity.length()));

                ballGrabbed = false;
                ballPhysicsBody.setActivationState(1); // Prevent the ball from deactivating
                ball.userData.isBeingGrabbed = false;
                // Implement your throwing logic here
                // Apply force to the ball when released



                // Power
                const forceMagnitude = 50;
                // Direction
                const forceDirection = new THREE.Vector3(0, 0, -1);

                forceDirection.applyQuaternion(rotation);
                forceDirection.multiplyScalar(forceMagnitude);

                const force = new Ammo.btVector3(forceDirection.x, forceDirection.y, forceDirection.z);
                ball.userData.physicsBody.applyCentralForce(force);

                //let force = new Ammo.btVector3(0, 0, -5); // Example force vector (0, 10, 0)
                //ball.userData.physicsBody.applyCentralForce(force);
                Ammo.destroy(force); // Clean up the force vector

            }
            // Save the current position and time for the next frame
            prevPosition.copy(position);

        } else if (grabbed && position.distanceTo(ball.position) < 0.1) {
            ballGrabbed = true;
            snapBallToCursor();
            //ball.matrix.copy(cursor.matrix.clone());
        } else {
            ballGrabbed = false;
            ballPhysicsBody.setActivationState(1); // Prevent the ball from deactivating
            ball.userData.isBeingGrabbed = false;

            // Update the physics body's position to match the cursor's position
            let transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(ball.position.x, ball.position.y, ball.position.z));
            ball.userData.physicsBody.getMotionState().setWorldTransform(transform);
            Ammo.destroy(transform);
        }
    }
    return { update };
}