import * as THREE from 'three'
import Experience from "../Experience";

export default class Planes {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.time = this.experience.time
		this.debug = this.experience.debug

		// Debug
		if (this.debug.active) {
			this.debugFolder = this.debug.ui.addFolder('Planes')
		}

		// Setup

		this.initPlanes()
	}

	initPlanes() {
		this.planes = new THREE.PlaneGeometry(1, 1)
		this.material = new THREE.MeshBasicMaterial({ color: 0xeeeeee })
		this.mesh = new THREE.Mesh(this.planes, this.material)
		this.scene.add(this.mesh)
	}

	update() { }
}