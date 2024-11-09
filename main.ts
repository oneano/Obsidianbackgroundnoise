// main.ts
import { App, ItemView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';

interface BackgroundNoiseSettings {
  videoUrls: string[];
}

const DEFAULT_SETTINGS: BackgroundNoiseSettings = {
  videoUrls: [],
};

const VIEW_TYPE_BACKGROUND_NOISE = 'background-noise-view';

export default class BackgroundNoisePlugin extends Plugin {
  settings: BackgroundNoiseSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_BACKGROUND_NOISE,
      (leaf) => new BackgroundNoiseView(leaf, this)
    );

    this.addSettingTab(new BackgroundNoiseSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.activateView();
    });
  }

  onunload() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_BACKGROUND_NOISE).forEach((leaf) => leaf.detach());
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Refresh the view when settings are saved
    this.app.workspace.getLeavesOfType(VIEW_TYPE_BACKGROUND_NOISE).forEach((leaf) => {
      const view = leaf.view as BackgroundNoiseView;
      view.render();
    });
  }

  async activateView() {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_BACKGROUND_NOISE).length === 0) {
      await this.app.workspace.getRightLeaf(false).setViewState({
        type: VIEW_TYPE_BACKGROUND_NOISE,
      });
    }
  }
}

class BackgroundNoiseView extends ItemView {
  plugin: BackgroundNoisePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: BackgroundNoisePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_BACKGROUND_NOISE;
  }

  getDisplayText() {
    return 'Background Noise';
  }

  async onOpen() {
    this.render();
  }

  async render() {
    const container = this.containerEl.children[1];
    container.empty();

    if (this.plugin.settings.videoUrls.length === 0) {
      container.createEl('p', { text: 'No videos configured. Please add YouTube URLs in the plugin settings.' });
      return;
    }

    // Create an iframe for each video URL
    this.plugin.settings.videoUrls.forEach((url) => {
      const videoId = extractVideoId(url);
      if (videoId) {
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '200';
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
        iframe.allow = 'autoplay';
        iframe.style.border = 'none';
        container.appendChild(iframe);
      } else {
        container.createEl('p', { text: `Invalid URL: ${url}` });
      }
    });
  }

  onClose() {
    // Cleanup when view is closed
    this.containerEl.empty();
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

class BackgroundNoiseSettingTab extends PluginSettingTab {
  plugin: BackgroundNoisePlugin;

  constructor(app: App, plugin: BackgroundNoisePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Background Noise Settings' });

    new Setting(containerEl)
      .setName('YouTube Video URLs')
      .setDesc('Add YouTube video URLs to play in the sidebar (one per line).')
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.videoUrls.join('\n'))
          .onChange(async (value) => {
            this.plugin.settings.videoUrls = value
              .split('\n')
              .map((url) => url.trim())
              .filter((url) => url.length > 0);
            await this.plugin.saveSettings();
          })
      )
      .then((setting) => {
        setting.controlEl.querySelector('textarea')!.style.height = '200px';
      });
  }
}
