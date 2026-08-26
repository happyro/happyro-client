import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import graphicsSource from '../../src/Preferences/Graphics.js?raw';
import introPreferencesSource from '../../src/UI/Components/Intro/Preferences.js?raw';

const apiSource = readFileSync(resolve(process.cwd(), 'applications/api/api.js'), 'utf8');
const builderSource = readFileSync(resolve(process.cwd(), 'applications/tools/builder-web.mjs'), 'utf8');
const charCreateV4Css = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/CharCreate/CharCreatev4/CharCreatev4.css'),
	'utf8'
);
const charCreateV4Html = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/CharCreate/CharCreatev4/CharCreatev4.html'),
	'utf8'
);
const inputBoxCss = readFileSync(resolve(process.cwd(), 'src/UI/Components/InputBox/InputBox.css'), 'utf8');
const introSource = readFileSync(resolve(process.cwd(), 'src/UI/Components/Intro/Intro.js'), 'utf8');
const introCss = readFileSync(resolve(process.cwd(), 'src/UI/Components/Intro/Intro.css'), 'utf8');
const gameEngineSource = readFileSync(resolve(process.cwd(), 'src/Engine/GameEngine.js'), 'utf8');
const mapViewerSource = readFileSync(resolve(process.cwd(), 'src/App/MapViewer.js'), 'utf8');

describe('interface defaults', () => {
	it('uses 1024x768 as the default and windowed fallback resolution', () => {
		expect(graphicsSource).toContain("screensize: '1024x768'");
		expect(introPreferencesSource).toContain("Graphics.screensize = '1024x768'");
		expect(apiSource).toContain("this.config.width = this.config.width || '1024'");
		expect(apiSource).toContain("this.config.height = this.config.height || '768'");
		expect(builderSource).toMatch(/var w = 1024, h = 768;/);
	});

	it('localizes the app launcher title and application labels', () => {
		expect(builderSource).toContain('<h1>roBrowser 应用启动器</h1>');
		for (const label of [
			'进入游戏',
			'Granny 模型查看器',
			'GRF 资源查看器',
			'地图查看器',
			'模型查看器',
			'STR 动画查看器',
			'特效查看器'
		]) {
			expect(builderSource).toContain(`label: '${label}'`);
		}
	});

	it('hides local resource import for remote games but keeps it in the map viewer', () => {
		expect(introSource).toContain('Intro.allowLocalFiles = true');
		expect(introSource).toMatch(/if \(Intro\.allowLocalFiles\) \{[\s\S]*dropZone\.addEventListener/);
		expect(introSource).toMatch(
			/else \{\s*root\.querySelector\('\.intro'\)\.classList\.add\('remote-resources'\);[\s\S]*root\.querySelector\('\.msg'\)\.remove\(\);/
		);
		expect(introCss).toMatch(
			/\.intro\.remote-resources \.btn_play \{\s*top: 50%;\s*transform: translate\(-50%, -50%\);/
		);
		expect(gameEngineSource).toContain("Intro.allowLocalFiles = !Configs.get('remoteClient')");
		expect(mapViewerSource).toContain('Intro.allowLocalFiles = true');
	});

	it('shows one character creation cancel icon inside the window', () => {
		expect(charCreateV4Css).toMatch(
			/#charcreate_v4 \.cancel \{[^}]*width: 17px;[^}]*height: 16px;[^}]*right: 9px;/s
		);
		expect(charCreateV4Html.match(/class="btn cancel"/g)).toHaveLength(1);
		expect(charCreateV4Html).toContain('<ui-button class="btn cancel" aria-label="取消"></ui-button>');
		expect(charCreateV4Html).not.toContain('make_character_ver2/bt_close_normal.bmp');
	});

	it('lowers the item quantity confirmation button', () => {
		expect(inputBoxCss).toMatch(/#inputbox ui-button \{[^}]*bottom: 5px;/s);
	});
});
