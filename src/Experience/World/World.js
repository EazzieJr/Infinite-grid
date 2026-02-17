import Experience from "../Experience";
import Planes from './Planes';

export default class world {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.resources = this.experience.resources


		this.resources.on('ready', () => {
			// Setup
			this.planes = new Planes()
		})
	}

	update() {
		if (this.fox) {
			this.fox.update()
		}
	}
}