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
		this.raycaster = this.experience.raycaster
		this.mouse = this.experience.mouse
		this.audio = this.experience.audio

		// Debug
		if (this.debug.active) {
			this.debugFolder = this.debug.ui.addFolder('Planes')
		}

		// Setup
		this.planes = new THREE.Group()
		this.currentIntersect = null
		this.animated = false
		this.planesDebugActive = false

		this.scene.add(this.planes)

		// Caches
		this.snapshot = {}
		this.pickedPlane = null

		this.initPlanes()
		this.checkForClick()
	}

	initPlanes() {
		const planeCount = 36;

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
		}

		setTimeout(() => {
			this.animate()
		}, 1000)
	}

	animate() {
		if (this.animated) return;
		this._buildTimeline();
	}

	updateRaycast() {
		// DON'T raycast at all when a plane is picked
		if (this.pickedPlane) return;

		this.raycaster.instance.setFromCamera(this.mouse.instance, this.camera);
		const intersects = this.raycaster.instance.intersectObjects(this.planes.children);

		if (intersects.length) {
			const intersected = intersects[0].object;

			if (this.currentIntersect !== intersected) {
				this._resetHoveredPlane();
				this.currentIntersect = intersected;

				// audio + pause (debounced)
				if (this.audio.paused || this.audio.currentTime > 0.1) {
					this.audio.currentTime = 0;
					this.audio.play();
				}
				this.planesRotationTl?.pause();

				gsap.killTweensOf(intersected.position);
				gsap.to(intersected.position, { y: 0.25, duration: 0.5, ease: 'power3.out' });
			}
		} else {
			if (this.currentIntersect) {
				this._resetHoveredPlane();
				this.currentIntersect = null;
				this.planesRotationTl?.play();
			}
		}
	}

	checkForClick() {
		this._clickHandler = () => {
			if (!this.currentIntersect) {
				if (this.pickedPlane) {
					this.restoreScene();
					return;
				}
				return;
			}

			if (this.pickedPlane === this.currentIntersect) return;

			this._cacheTransforms();
		}

		window.addEventListener('click', this._clickHandler);
	}

	restoreScene() {
		if (!this.pickedPlane || !this.snapshot.camera.position) return;

		const duration = 1.5;

		gsap.to(this.camera.position, {
			x: this.snapshot.camera.position.x,
			y: this.snapshot.camera.position.y,
			z: this.snapshot.camera.position.z,
			duration,
			ease: 'power3.inOut'
		});

		gsap.to(this.planes.rotation, {
			x: this.snapshot.planes.rotation.x,
			y: this.snapshot.planes.rotation.y,
			z: this.snapshot.planes.rotation.z,
			duration,
			ease: 'power3.out',
			onComplete: () => {
				this.pickedPlane = null;
				this.animated = true;
				this.planesRotationTl?.play();
			}
		});


		this.planes.children.forEach((plane, index) => {
			// if (plane !== this.pickedPlane) {
			gsap.to(plane.position, {
				x: this.snapshot.planeTransforms[index].position.x,
				y: 0,
				z: this.snapshot.planeTransforms[index].position.z,
				duration,
				ease: 'power3.inOut'
			});

			gsap.to(plane.rotation, {
				y: this.snapshot.planeTransforms[index].rotation.y,
				duration,
				ease: 'power3.inOut'
			});
		});
	}

	destroy() {
		this.planes.children.forEach(plane => {
			plane.geometry.dispose();
			plane.material.dispose();
		});
		this.scene.remove(this.planes);
		window.removeEventListener('click', this._clickHandler);
	}

	update() {
		if (this.mouse.mouseMoved && (this.animated || this.pickedPlane)) {
			this.updateRaycast();
		}
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
		this.planesRotationTl.to(this.planes.rotation,
			{
				x: 0.4, y: Math.PI * 2, z: -0.1, duration: 5, ease: 'power3.inOut',
				onComplete: () => {
					this.animated = true;
				}
			}, 0);

		this.planesRotationTl.to(this.planes.rotation, {
			y: '+=' + Math.PI * 2,
			duration: 100,
			ease: 'none',
			repeat: -1,
		}, '-=0.75');
	}

	_attachDebugOnComplete() {
		if (!this.planesDebugActive && this.debug.active) {
			['x', 'y', 'z'].forEach(ax =>
				this.debugFolder
					.add(this.planes.rotation, ax)
					.name(`Rot ${ax.toUpperCase()}`)
					.min(-10).max(10).step(0.1)
			);
			this.planesDebugActive = true;
		}
		// this.animated = true;
	}

	_resetHoveredPlane() {
		if (!this.currentIntersect) return;
		console.log("reset");
		gsap.killTweensOf(this.currentIntersect.position);
		gsap.to(this.currentIntersect.position, {
			y: 0,
			duration: 0.5,
			ease: 'power3.out'
		});
	}

	_cacheTransforms() {
		this.pickedPlane = this.currentIntersect;
		this.snapshot = {
			camera: {
				position: this.camera.position.clone(),
				rotation: this.camera.rotation.clone(),
			},
			planes: {
				rotation: this.planes.rotation.clone(),
			},
			planeTransforms: this.planes.children.map(p => ({
				position: p.position.clone(),
				rotation: p.rotation.clone(),
			}))
		};

		this._animatePickedPlane();
	}

	_animatePickedPlane() {
		this.animated = false;
		this.audio.pause();
		this.planesRotationTl?.pause();

		const planes = this.planes.children;
		const picked = this.pickedPlane;
		const pickedIndex = planes.indexOf(picked);
		const delayMultiplier = 0.025;

		planes.forEach((plane, index) => {
			if (plane === picked) {
				console.log("Initial Position: ", plane.position);

				gsap.to(plane.position, {
					x: 0,
					y: 0,
					z: 0,
					duration: 1.5,
					// delay: 0.5,
					ease: "power3.inOut",
					onComplete: () => {
						this.camera.lookAt(plane.position);
					}
				});

				gsap.to(plane.rotation, {
					x: 0,
					y: 0,
					z: 0,
					duration: 2.5,
					ease: "power3.inOut",
				});

				gsap.to(this.planes.rotation, {
					x: 0,
					z: 0,
					y: 0,
					duration: 2.5,
					ease: "power3.inOut",
				});

				gsap.to(this.camera.position, {
					z: 2,
					duration: 2.5,
					ease: "power3.inOut",
				});
			} else {
				const total = planes.length;
				const delay = index > pickedIndex
					? (index - pickedIndex) * delayMultiplier
					: (total - pickedIndex + index) * delayMultiplier;

				gsap.to(plane.position, {
					y: -10,
					duration: 0.75,
					delay,
					ease: "power3.inOut"
				});
			}
		});
	}
}