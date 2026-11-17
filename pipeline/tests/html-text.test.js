import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeEntities, htmlToFlatText, removeScriptsAndStyles, stripTags,
} from '../src/core/html-text.js';

test('entities decode in one pass, so an escaped entity stays literal', () => {
  assert.equal(decodeEntities('&amp;lt;b&amp;gt;'), '&lt;b&gt;');
  assert.equal(decodeEntities('Z&#322;ot&oacute;w &Oacute;w &#x17C;'), 'Złotów Ów ż');
  assert.equal(decodeEntities('&unknown; &#0; &#xD800;'), '&unknown; \uFFFD \uFFFD');
});

test('nested tags cannot reassemble after one removal pass', () => {
  assert.equal(stripTags('<<b>script>alert(1)<</b>/script>').includes('<'), false);
  assert.equal(stripTags('<b>Kopernika</b> 12'), 'Kopernika 12');
});

test('script and style blocks go even with uppercase or spaced closing tags', () => {
  assert.equal(removeScriptsAndStyles('a<SCRIPT type="x">bad()</script >b<style>p{}</STYLE\n>c'), 'abc');
  assert.equal(removeScriptsAndStyles('<scr<script>x</script>ipt>y</script>z'), 'z');
});

test('flat text drops markup, decodes entities and collapses whitespace', () => {
  const html = '<p>Lokal&nbsp;nr 6<br/>ul.&nbsp;Siekiela 23</p><script>x()</script> cena 58&nbsp;000&nbsp;z&#322;';
  assert.equal(htmlToFlatText(html), 'Lokal nr 6 ul. Siekiela 23 cena 58 000 zł');
  assert.equal(htmlToFlatText(null), '');
});
