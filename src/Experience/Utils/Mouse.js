import * as THREE from "three"

export default class Mouse{
	constructor(sizes) {
		this.instance = new THREE.Vector2()
		this.mouseMoved = false
		
		window.addEventListener('mousemove', (event) => {
			this.mouseMoved = true
			this.instance.x = event.clientX / sizes.width * 2 - 1
			this.instance.y = - (event.clientY / sizes.height) * 2 + 1
		})
	}
}