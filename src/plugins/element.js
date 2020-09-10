import Vue from 'vue'

import Element from 'element-ui';

Vue.use(Element, { size: 'small', zIndex: 3000 });

import lang from 'element-ui/lib/locale/lang/pt-br'
import locale from 'element-ui/lib/locale'

locale.use(lang)
