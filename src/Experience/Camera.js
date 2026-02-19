import * as THREE from 'three'
import Experience from "./Experience";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default class Camera{
	constructor() {
		// Setup
		this.experience = new Experience()
		this.sizes = this.experience.sizes
		this.canvas = this.experience.canvas
		this.scene = this.experience.scene

		this.setInstance()
		this.setOrbitControls()
	}

	setInstance() {
		this.instance = new THREE.PerspectiveCamera(
			35, this.sizes.width / this.sizes.height, 0.1, 100
		)
		this.instance.position.set(0, 0, 5)
	}

	setOrbitControls() {
		this.controls = new OrbitControls(this.instance, this.canvas)
		this.controls.enableDamping = true
		this.controls.enableZoom = false
		// this.controls.minPolarAngle = Math.PI * 0.5
		// this.controls.maxPolarAngle = Math.PI * 0.5
	}

	resize() {
		this.instance.aspect = this.sizes.width / this.sizes.height
		this.instance.updateProjectionMatrix()
	}

	update() {
		this.controls.update()
	}
}