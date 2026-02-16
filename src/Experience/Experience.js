import * as THREE from 'three'
import Sizes from "./Utils/Sizes"
import Time from "./Utils/Time"
import Camera from './Camera'
import Renderer from './Renderer';
import world from './World/World';
import Resources from './Utils/Resources';
import sources from './sources'
import Debug from './Utils/Debug';

let instance;

export default class Experience {
	constructor(canvas) {
		if (instance) {
			return instance
		}

		instance = this
		
		// Global access
		window.experience = this

		// Options
		this.canvas = canvas

		//Setup
		this.debug = new Debug()
		this.sizes = new Sizes()
		this.time = new Time()
		this.scene = new THREE.Scene()
		this.resources = new Resources(sources)
		this.camera = new Camera()
		this.renderer = new Renderer()
		this.world = new world()

		this.sizes.on('resize', () => {
			this.resize()
		})

		this.time.on('tick', () => {
			this.update()
		})
	}

	resize() {
		this.camera.resize()
		this.renderer.resize()
	}

	update() {
		this.camera.update()
		this.world.update()
		this.renderer.update()
	}
	destroy() {
		this.sizes.off('resize')
		this.time.off('tick')
	}
}