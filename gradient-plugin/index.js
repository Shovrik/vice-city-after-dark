(() => {
  // Classic Revenge / Vendetta plugin: experimental targeted gradient backgrounds.
  const { patcher, metro, logger, ui } = vendetta;
  const { React, ReactNative, clipboard } = metro.common;
  const { ImageBackground, ScrollView, Text } = ReactNative;
  const GRADIENT = 'https://raw.githubusercontent.com/Shovrik/vice-city-after-dark/main/gradient-plugin/gradient.png';
  const NAMES = new Set([
    'GuildHeader', 'GuildHeaderView', 'GuildChannelHeader',
    'ChannelHeader', 'ChannelHeaderView', 'ChannelHeaderTitle',
    'GuildMemberList', 'GuildMembersList', 'MembersList', 'MemberList',
    'GuildMemberListContainer', 'MemberListContainer'
  ]);
  const unpatches = [];
  const hits = Object.create(null);
  let wrapped = 0;
  let hooks = 0;
  const nameOf = type => type && (type.displayName || type.name || (type.render && type.render.name)) || '';
  function decorate(args, original) {
    const node = original(...args);
    const name = nameOf(args[0]);
    if (!NAMES.has(name)) return node;
    hits[name] = (hits[name] || 0) + 1;
    wrapped++;
    // ImageBackground renders the child ABOVE the PNG. No text/content replacement.
    return React.createElement(ImageBackground, {
      source: { uri: GRADIENT },
      resizeMode: 'stretch',
      style: { alignSelf: 'stretch' },
      imageStyle: { opacity: 0.78 },
    }, node);
  }
  function install() {
    const seen = new Map();
    for (const method of ['jsx', 'jsxs', 'jsxDEV']) {
      let modules = [];
      try { modules = metro.findByPropsAll(method) || []; } catch (_) {}
      for (const mod of modules) {
        if (!mod || typeof mod[method] !== 'function') continue;
        let entries = seen.get(mod);
        if (!entries) { entries = new Set(); seen.set(mod, entries); }
        if (entries.has(method)) continue;
        entries.add(method);
        unpatches.push(patcher.instead(method, mod, (args, original) => decorate(args, original)));
        hooks++;
      }
    }
    if (React && typeof React.createElement === 'function') {
      unpatches.push(patcher.instead('createElement', React, (args, original) => decorate(args, original)));
      hooks++;
    }
    logger.log('[Vice Gradient] installed hooks: ' + hooks);
  }
  function diagnostics() {
    return 'Vice City Neon Gradient — experimental\nHooks: ' + hooks +
      '\nWrapped components: ' + wrapped + '\nMatches: ' + JSON.stringify(hits) +
      '\nIf matches=0, component names need adapting for your Discord build.';
  }
  function Settings() {
    const Forms = ui.components.Forms;
    return React.createElement(ScrollView, null,
      React.createElement(Forms.FormRow, {label:'Copy diagnostics',subLabel:'Open server header and member drawer first; then copy the report.',onPress:()=>{
        const info=diagnostics();
        try {clipboard.setString(info);ui.toasts.showToast('Diagnostics copied');}catch(e){logger.log(info);}
      }}),
      React.createElement(Text, {style:{padding:16,color:'#DDFBEF'}},'Gradient: purple top-left → green bottom-right. Existing yacht theme remains unchanged. This is an untested trial version.')
    );
  }
  return {
    onLoad() { install(); },
    onUnload() { while (unpatches.length) { try { unpatches.pop()(); } catch (_) {} } },
    settings: Settings,
  };
})()