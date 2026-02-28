import * as THREE from 'three'
import Sizes from "./Utils/Sizes"
import Time from "./Utils/Time"
import Camera from './Camera'
import Renderer from './Renderer';
import world from './World/World';
import Resources from './Utils/Resources';
import sources from './sources'
import Debug from './Utils/Debug';
import Raycaster from './Utils/Raycaster';
import Mouse from './Utils/Mouse';



let instance;

export default class Experience {
	constructor(canvas, audio, switcher) {
		if (instance) {
			return instance
		}

		instance = this
		
		// Global access
		window.experience = this

		// Options
		this.canvas = canvas
		this.audio = audio
		this.switcher = switcher

		//Setup
		this.debug = new Debug()
		this.sizes = new Sizes()
		this.time = new Time()
		this.scene = new THREE.Scene()
		this.resources = new Resources(sources)
		this.mouse = new Mouse(this.sizes)
		this.camera = new Camera()
		this.renderer = new Renderer()
		this.world = new world()
		this.raycaster = new Raycaster()

		// Debug
		if (this.debug.active) {
			this.debugFolder = this.debug.ui.addFolder('Experience')
		}

		this.sizes.on('resize', () => {
			this.resize()
		})

		this.time.on('tick', () => {
			this.update()
		})

		// this.setFog()
	}

	setFog() {
		this.scene.fog = new THREE.Fog(0xff0000, 15, 20)

		if (this.debug.active) {
			this.debugFolder.addColor(this.scene.fog, "color").name("Fog (color)")
			this.debugFolder.add(this.scene.fog, "near").name("Fog (near)").min(0)
				.max(100)
				.step(1)
			this.debugFolder.add(this.scene.fog, "far").name("Fog (far)").min(0)
				.max(100)
				.step(1)
		}
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