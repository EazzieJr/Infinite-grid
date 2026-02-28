import { gsap } from "gsap"
import * as THREE from 'three'
import Experience from "../Experience";
import vertexShader from "../../../static/shaders/vertex.glsl"
import fragmentShader from "../../../static/shaders/fragment.glsl"

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
		this.switcher = this.experience.switcher
		this.images = this.experience.resources.items.planeImages

		console.log(this.images)

		// Debug
		if (this.debug.active) {
			this.debugFolder = this.debug.ui.addFolder('Planes')
		}

		// Setup
		this.planes = new THREE.Group()
		this.currentIntersect = null
		this.animated = false
		this.planesDebugActive = false
		this.planeCount = 36
		this.waveAmplitude = 0.6

		this.switcher.forEach(button => {
			button.addEventListener('click', () => {
				this.switchLayout(button.dataset.layout)
			})
		})

		this.scene.add(this.planes)

		// Caches
		this.snapshot = {}
		this.pickedPlane = null
		this.currentLayout = null
		this.layouts = {
			Stack: {
				camera: { position: { z: 5 }, rotation: { x: 0, y: 0, z: 0 } },
				planes: { rotation: { x: 0, y: 0, z: 0 } },
				init: () => this.stackPlanes()
			},
			Linear: {
				camera: { position: { z: 3 }, rotation: { x: 0, y: 0, z: 0 } },
				planes: { rotation: { x: 0, y: 0, z: 0 } },
				init: () => this.initLinearPlanes()
			},
			Circular: {
				camera: { position: { z: 15 }, rotation: { x: 0.25, y: 0, z: 0 } },
				planes: { rotation: { x: 0, y: 0, z: 0 } },
				init: () => {
					this._spreadPlanes()
				}
			}
		}

		// --- Drag rotation state ---
		this.drag = {
			active: false,
			startX: 0,
			lastX: 0,
			velocityX: 0,
			damping: 0.99,        // 0–1, higher = longer coast
			sensitivity: 0.005,   // radians per pixel
		}

		if (this.debugFolder) {
			this.debugFolder.add(this, 'waveAmplitude').min(0).max(1).step(0.01).onChange(() => {
				this.planes.children.forEach(plane => {
					plane.material.uniforms.uWaveAmplitude.value = this.waveAmplitude
				})
			})

			this.debugFolder.add(this.drag, 'damping').min(0.92).max(0.99).step(0.01)
		}

		this._initDragListeners()
		// --------------------------

		this.createPlanes()
		setTimeout(() => {
			this.animate()
		}, 1000)
		// this.checkForClick()
	}

	createPlanes() {
		for (let i = 0; i < this.planeCount; i++) {
			const material = new THREE.ShaderMaterial({
				fragmentShader, vertexShader,
				side: THREE.DoubleSide,
				uniforms: {
					uRotation: { value: 0 },
					uTime: { value: 0 },
					uRippleIntensity: { value: 0.5 },
					uTexture: { value: this.images[i] },
					uWaveAmplitude: { value: this.waveAmplitude },
				}
			})

			const geometry = new THREE.PlaneGeometry(1.5, 1, 64, 64);
			const plane = new THREE.Mesh(geometry, material);

			this.planes.add(plane);
			plane.updateMatrixWorld()
		}

		this.stackPlanes()
	}

	stackPlanes() {
		this.planes.children.forEach((plane, i) => {
			gsap.to(plane.position, {
				x: 0,
				y: 0,
				z: -i * 0.01,
				duration: 1.5,
				ease: 'power3.inOut'
			})
			gsap.to(plane.rotation, {
				x: 0,
				y: 0,
				z: 0,
				duration: 1.5,
				ease: 'power3.inOut'
			})
		})
	}

	initLinearPlanes() {
		const spacing = 1.25;
		const planes = this.planes.children;

		planes.forEach((plane, i) => {
			gsap.to(plane.position, {
				x: 0,
				y: -i * spacing,
				z: 0,
				duration: 1.5,
				ease: 'power3.inOut'
			})

			gsap.to([plane.rotation, this.planes.rotation], {
				x: 0,
				y: 0,
				z: 0,
				duration: 1.5,
				ease: 'power3.inOut'
			})

			gsap.to(this.camera.rotation, {
				x: 0,
				y: 0,
				z: 0,
				duration: 1.5,
				ease: 'power3.inOut'
			})

			gsap.to(this.camera.position, {
				z: 3,
				duration: 1.5,
				ease: 'power3.inOut'
			})

			// plane.position.set(0, 0, -i * spacing);

			plane.updateMatrixWorld()
		})
	}

	switchLayout(layout) {
		this.planesRotationTl?.kill()
		this.currentLayout = layout
		const config = this.layouts[layout]
		if (!config) return

		// Reset drag velocity so it doesn't fight the new layout
		this.drag.velocityX = 0

		gsap.to(this.camera.position, { ...config.camera.position, duration: 1.5, ease: 'power3.inOut' })
		gsap.to(this.camera.rotation, { ...config.camera.rotation, duration: 1.5, ease: 'power3.inOut' })
		gsap.to(this.planes.rotation, { ...config.planes.rotation, duration: 1.5, ease: 'power3.inOut' })

		config.init()
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

		// Clean up drag listeners
		window.removeEventListener('pointerdown', this._onPointerDown)
		window.removeEventListener('pointermove', this._onPointerMove)
		window.removeEventListener('pointerup', this._onPointerUp)
		window.removeEventListener('pointercancel', this._onPointerUp)
	}

	update() {
		this._updateDrag()

		// Keep uTime alive for ripple wave animation
		this.planes.children.forEach(plane => {
			plane.material.uniforms.uTime.value = this.time.elapsed
		})

		if (this.mouse.mouseMoved && (this.animated || this.pickedPlane)) {
			// this.updateRaycast()
		}
	}

	_buildTimeline() {
		this.planesRotationTl = gsap.timeline();

		this._spreadPlanes();
		this._moveCamera();
		// this._rotateCarousel();
		// this._attachDebugOnComplete();
	}

	_spreadPlanes() {
		const radius = 3;
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

	_initDragListeners() {
		this._onPointerDown = (e) => {
			this.drag.active = true
			this.drag.startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
			this.drag.lastX = this.drag.startX
			this.drag.velocityX = 0

			// Pause the carousel while the user is dragging
			this.planesRotationTl?.pause()
		}

		this._onPointerMove = (e) => {
			if (!this.drag.active) return
			const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
			const deltaX = clientX - this.drag.lastX

			this.drag.velocityX = deltaX * this.drag.sensitivity
			this.planes.rotation.y += this.drag.velocityX
			this.drag.lastX = clientX

			// Push live velocity to all shaders
			this.planes.children.forEach(plane => {
				plane.material.uniforms.uRotation.value = this.drag.velocityX
			})
		}

		this._onPointerUp = () => {
			if (!this.drag.active) return
			this.drag.active = false
			// velocity carries over into the update loop for damping
		}

		window.addEventListener('pointerdown', this._onPointerDown)
		window.addEventListener('pointermove', this._onPointerMove)
		window.addEventListener('pointerup', this._onPointerUp)
		window.addEventListener('pointercancel', this._onPointerUp)
	}

	// ── Apply damping every frame ─────────────────────────────────────────────

	_updateDrag() {
		if (this.drag.active) return

		if (Math.abs(this.drag.velocityX) > 0.0001) {
			this.planes.rotation.y += this.drag.velocityX
			this.drag.velocityX *= this.drag.damping

			// Feed velocity into all plane uniforms
			this.planes.children.forEach(plane => {
				plane.material.uniforms.uRotation.value = this.drag.velocityX
			})
		} else {
			this.drag.velocityX = 0

			// Decay the ripple back to 0 smoothly
			this.planes.children.forEach(plane => {
				plane.material.uniforms.uRotation.value *= 0.92
			})
		}
	}
}