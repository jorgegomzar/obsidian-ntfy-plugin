import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface NTFYPluginSettings {
	ntfy_server_url: string;
	ntfy_topic: string;
	warned_user: boolean;
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
			async (evt: MouseEvent) => {
				await this.loadSettings();
				new NTFYModal(this).open();
		});

		// Command
		this.addCommand({
			id: 'open-ntfy-modal-simple',
			name: 'Send message to queue',
			callback: async () => {
				await this.loadSettings();
				new NTFYModal(this).open();
			}
		});

		// Settings
		this.addSettingTab(new NTFYSettingTab(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// We want to make sure the url is well formed
		if (this.settings.ntfy_server_url[-1] != '\/')
			this.settings.ntfy_server_url += '\/'

		if (!this.settings.warned_user)
			this.settings.warned_user = true
			new Notice('Please check your NTFY settings. Using default values.');
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class NTFYModal extends Modal {
	settings: NTFYPluginSettings
	message: string

	constructor(plugin: NTFYPlugin) {
		super(plugin.app);
		this.settings = plugin.settings
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl('h1', { text: 'Obsidian NTFY: Send message to queue' })

		new Setting(contentEl)
			.setName('Message content')
			.addText((text) =>
				text.onChange((value) => {
					this.message = value
				})
			)
		
		new Setting(contentEl)
			.addButton((btn) => 
				btn
				.setButtonText('Send')
				.setCta()
				.onClick(() => {
					this.onSubmit(this.message)
					this.close();
				})
			)

	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
		this.message = ''
	}

	onSubmit(message: string) {
		fetch(this.settings.ntfy_server_url + this.settings.ntfy_topic, {
			method: 'POST',
			body: message,
		})

		new Notice('Sending message to ' + this.settings.ntfy_topic + ' topic...');
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

		this._add_configurations(containerEl)

	}
	_add_configurations(containerEl: HTMLElement) {
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
