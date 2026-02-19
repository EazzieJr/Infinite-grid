import { gsap } from "gsap"
import * as THREE from 'three'
import Experience from "../Experience";

export default class Planes {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.time = this.experience.time
		this.debug = this.experience.debug
		this.camera = this.experience.camera.instance
		// Debug
		if (this.debug.active) {
			this.debugFolder = this.debug.ui.addFolder('Planes')
		}

		// Setup
		this.planes = new THREE.Group()
		this.animated = false
		this.camera.lookAt(this.planes.position)


		this.scene.add(this.planes)

		this.initPlanes()
	}

	initPlanes() {
		const radius = 0
		const planeCount = 36;
		const angleStep = (Math.PI * 2) / (planeCount);

		for (let i = 0; i < planeCount; i++) {
			const material = new THREE.MeshBasicMaterial({
				color: 0xEEEEEE,
				side: THREE.DoubleSide
			})

			const geometry = new THREE.PlaneGeometry(1.5, 1);
			const plane = new THREE.Mesh(geometry, material);

			plane.position.set(0, 0, -i * 0.01);
			plane.scale.set(1, 1, 1);

			this.planes.add(plane);

			plane.updateMatrixWorld()

			setTimeout(() => {
				this.animate()
			}, 1000)
		}
	}

	animate() {
		if (this.animated) return;

		this._buildTimeline();
		this.animated = true;
	}

	_buildTimeline() {
		this.planesRotationTl = gsap.timeline();

		this._spreadPlanes();
		this._moveCamera();
		this._rotateCarousel();
		this._attachDebugOnComplete();
	}

	_spreadPlanes() {
		const radius = 5;
		const angleStep = (Math.PI * 2) / this.planes.children.length;

		this.planes.children.forEach((plane, i) => {
			const angle = i * angleStep;
			const x = Math.cos(angle) * radius;
			const z = Math.sin(angle) * radius;

			gsap.to(plane.position, { x, y: 0, z, duration: 1, ease: 'power3.inOut' });
			gsap.to(plane.rotation, { y: -angle, duration: 1, ease: 'power3.inOut' });
		});
	}

	_moveCamera() {
		this.planesRotationTl.to(this.camera.position,
			{ z: 15, duration: 3, ease: 'power3.in' }, 0);
	}

	_rotateCarousel() {
		/* intro spin */
		this.planesRotationTl.to(this.planes.rotation,
			{ x: 0.4, y: Math.PI * 2, z: -0.1, duration: 5, ease: 'power3.inOut' }, 0);

		/* endless rotation */
		this.planesRotationTl.to(this.planes.rotation, {
			y: '+=' + Math.PI * 2,
			duration: 100,
			ease: 'none',
			repeat: -1
		}, '-=0.75');
	}

	_attachDebugOnComplete() {
		this.planesRotationTl.eventCallback('onComplete', () => {
			if (!this.planesDebugActive && this.debug.active) {
				['x', 'y', 'z'].forEach(ax =>
					this.debugFolder
						.add(this.planes.rotation, ax)
						.name(`Rot ${ax.toUpperCase()}`)
						.min(-10).max(10).step(0.1)
				);
				this.planesDebugActive = true;
			}
		});
	}


	destroy() {
		this.planes.children.forEach(plane => {
			plane.geometry.dispose();
			plane.material.dispose();
		});

		this.scene.remove(this.planes);
	}

	update() { }
}
