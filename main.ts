import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface NTFYPluginSettings {
	ntfy_server_url: string;
	ntfy_topic: string;
	warned_user: boolean;
}

interface NTFYMessage {
	title: string;
	body: string;
	attachment: string;
}

const DEFAULT_EMPTY_MESSAGE: NTFYMessage = {
	title: '',
	body: '',
	attachment: '',
}
const DEFAULT_SETTINGS: NTFYPluginSettings = {
	ntfy_server_url: 'https://ntfy.sh',
	ntfy_topic: 'obsidian-ntfy',
	warned_user: false,
}

export default class NTFYPlugin extends Plugin {
	settings: NTFYPluginSettings;

	async onload() {
		await this.loadSettings();

		// RibbonIcon
		this.addRibbonIcon(
			'megaphone',
			'Obsidian NTFY Plugin',
			(evt: MouseEvent) => {
				new NTFYModal(this.app, (ntfyMessage) => this.sendMessage(ntfyMessage)).open();
		});

		// Command
		this.addCommand({
			id: 'open-ntfy-modal-send-message',
			name: 'Send message to queue',
			callback: () => {
				new NTFYModal(this.app, (ntfyMessage) => this.sendMessage(ntfyMessage)).open();
			}
		});

		// Command
		this.addCommand({
			id: 'open-ntfy-modal-send-note',
			name: 'Send current note to queue',
			callback: async () => {
				// Currently Open Note
				const noteFile = this.app.workspace.getActiveFile();

				// Nothing Open
				if(!noteFile || !noteFile.name) {
					new Notice('No file selected');
					return;
				}

				const fileMessage = {
					title: noteFile.basename,
					body: await this.app.vault.read(noteFile),
				}

				let ntfyMessage = Object.assign({}, DEFAULT_EMPTY_MESSAGE, fileMessage)
				this.sendMessage(ntfyMessage)
			}
		});

		// Settings
		this.addSettingTab(new NTFYSettingTab(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Let's warn the user the first time they enable the plugin
		if (!this.settings.warned_user)
			this.settings.warned_user = true
			new Notice('Please check your NTFY settings');
			await this.saveSettings()
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// This method will be passed to other components as a lambda
	async sendMessage(ntfyMessage: NTFYMessage) {
		fetch(this.settings.ntfy_server_url + this.settings.ntfy_topic, {
			method: 'POST',
			body: ntfyMessage.body,
			headers: {
				'Title': ntfyMessage.title,
				'Tags': "crystal_ball",
			}
		})

		new Notice('Sending message to ++' + this.settings.ntfy_topic + '++ topic...');
	}
}

class NTFYModal extends Modal {
	ntfyMessage: NTFYMessage
	// this method will be injected as a lambda by the plugin class
	sendMessage: (ntfyMessage: NTFYMessage) => void;

	constructor(app: App, sendMessage: (ntfyMessage: NTFYMessage) => void) {
		super(app);
		this.sendMessage = sendMessage
	}

	onOpen() {
		this.ntfyMessage = Object.assign({}, DEFAULT_EMPTY_MESSAGE)

		const {contentEl} = this;
		contentEl.createEl('h3', { text: 'Obsidian NTFY: Send message to queue' })

		new Setting(contentEl)
			.setName('Message title')
			.addText((text) =>
				text.onChange((value) => {
					this.ntfyMessage.title = value
				})
			)

		// Message textbox
		new Setting(contentEl)
			.setName('Message content')
			.addText((text) =>
				text.onChange((value) => {
					this.ntfyMessage.body = value
				})
			)
		
		// Submit btn
		new Setting(contentEl)
			.addButton((btn) => 
				btn
				.setButtonText('Send')
				.setCta()
				.onClick(async () => {
					this.sendMessage(this.ntfyMessage);
					this.close();
				})
			)		
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class NTFYSettingTab extends PluginSettingTab {
	plugin: NTFYPlugin;
	
	constructor(app: App, plugin: NTFYPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		this._add_settings(containerEl)

	}
	_add_settings(containerEl: HTMLElement) {
		// NTFY SERVER URL
		new Setting(containerEl)
		.setName('NTFY Server URL')
		.setDesc('The url to your NTFY server. Default: ' + DEFAULT_SETTINGS.ntfy_server_url)
		.addText(
			text => text
			.setPlaceholder(DEFAULT_SETTINGS.ntfy_server_url)
			.setValue(this.plugin.settings.ntfy_server_url)
			.onChange(async (value) => {
				if (!value)
					value = DEFAULT_SETTINGS.ntfy_server_url

				// We want to make sure the url is well formed
				if (value.substring(value.length - 1) != '/')
					value += '/'
				
				this.plugin.settings.ntfy_server_url = value;
				await this.plugin.saveSettings();
			})
		);

		// NTFY TOPIC
		new Setting(containerEl)
		.setName('NTFY Topic')
		.setDesc('Your NTFY Topic. Default: ' + DEFAULT_SETTINGS.ntfy_topic)
		.addText(
			text => text
			.setPlaceholder(DEFAULT_SETTINGS.ntfy_topic)
			.setValue(this.plugin.settings.ntfy_topic)
			.onChange(async (value) => {
				if (!value)
					value = DEFAULT_SETTINGS.ntfy_topic
				this.plugin.settings.ntfy_topic = value;
				await this.plugin.saveSettings();
			})
		);
	}
}
