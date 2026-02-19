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
		this.tempGeoLocation = {}
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
		this.raycaster.instance.setFromCamera(this.mouse.instance, this.camera);
		const intersects = this.raycaster.instance.intersectObjects(this.planes.children);

		if (intersects.length) {
			const intersected = intersects[0].object;

			if (this.currentIntersect !== intersected) {
				// don't re-hover the picked plane
				if (this.pickedPlane === intersected) return;

				this._resetHoveredPlane();
				this.currentIntersect = intersected;

				// audio + pause (debounced)
				if (this.audio.paused || this.audio.currentTime > 0.1) {
					this.audio.currentTime = 0;
					this.audio.play();
				}
				this.planesRotationTl?.pause();

				// lift plane
				gsap.killTweensOf(intersected.position);
				gsap.to(intersected.position, { y: 0.25, duration: 0.5, ease: 'power3.out' });
			}
		} else {
			if (this.currentIntersect) {
				this._resetHoveredPlane();
				this.currentIntersect = null;

				if (!this.pickedPlane) {
					this.planesRotationTl?.play();
				}
			}
		}
	}

	checkForClick() {
		window.addEventListener('click', () => {
			if (!this.currentIntersect) {
				if (this.pickedPlane) {
					this.restoreScene();
					return;
				}
				return;
			}

			if (this.pickedPlane === this.currentIntersect) return;

			this._cacheTransforms();
			this._animatePickedPlane();
		});
	}

	restoreScene() {
		if (!this.pickedPlane || !this.tempGeoLocation.cameraPosition) return;

		const duration = 1.5;

		gsap.to(this.camera.position, {
			x: this.tempGeoLocation.cameraPosition.x,
			y: this.tempGeoLocation.cameraPosition.y,
			z: this.tempGeoLocation.cameraPosition.z,
			duration,
			ease: 'power3.inOut'
		});

		gsap.to(this.planes.rotation, {
			x: this.tempGeoLocation.planesRotation.x,
			y: this.tempGeoLocation.planesRotation.y,
			z: this.tempGeoLocation.planesRotation.z,
			duration,
			ease: 'power3.inOut'
		});

		gsap.to(this.scene.rotation, {
			x: this.tempGeoLocation.sceneRotation.x,
			y: this.tempGeoLocation.sceneRotation.y,
			z: this.tempGeoLocation.sceneRotation.z,
			duration,
			ease: 'power3.inOut'
		});

		this.planes.children.forEach(plane => {
			if (plane !== this.pickedPlane) {
				gsap.to(plane.position, { y: 0, duration, ease: 'power3.inOut' });
			}
		});

		gsap.to(this.pickedPlane.position, {
			x: this.tempGeoLocation.clickedPlanePosition.x,
			y: this.tempGeoLocation.clickedPlanePosition.y,
			z: this.tempGeoLocation.clickedPlanePosition.z,
			duration,
			ease: 'power3.inOut',
			onComplete: () => {
				this.pickedPlane = null;
				this.animated = true;
				this.planesRotationTl?.play();
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
			this.animated = true;
		});
	}

	_resetHoveredPlane() {
		if (!this.currentIntersect) return;
		gsap.killTweensOf(this.currentIntersect.position);
		gsap.to(this.currentIntersect.position, {
			y: 0,
			duration: 0.5,
			ease: 'power3.out'
		});
	}

	_cacheTransforms() {
		this.pickedPlane = this.currentIntersect;
		this.tempGeoLocation = {
			cameraPosition: this.camera.position.clone(),
			cameraRotation: this.camera.rotation.clone(),
			clickedPlanePosition: this.pickedPlane.position.clone(),
			clickedPlaneRotation: this.pickedPlane.rotation.clone(),
			sceneRotation: this.scene.rotation.clone(),
			planesRotation: this.planes.rotation.clone(),
		};
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
				gsap.to(plane.position, {
					x: 0,
					y: 0,
					z: 0,
					duration: 1.5,
					delay: 0.5,
					ease: "power3.inOut"
				});

				gsap.to([plane.rotation, this.scene.rotation, this.planes.rotation], {
					x: 0,
					y: 0,
					z: 0,
					duration: 2.5,
					ease: "power3.inOut"
				});

				gsap.to(this.camera.position, {
					z: 2,
					duration: 2.5,
					ease: "power3.inOut",
					onComplete: () => {
						this.animated = true;
					}
				});
			} else {
				if (this.audio.paused || this.audio.currentTime > 0.1) {
					this.audio.currentTime = 0;
					this.audio.play();
				}

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