export default function undent(str, ...props) {
  const doUndent = (str) => {
    str = str.split('\n');
    if (str[0].match(/^\s*$/)) str = str.slice(1);
    if (str.slice(-1)[0].match(/^\s*$/)) str = str.slice(0, -1);
    var minLen = Math.min(
      ...str.filter((s) => s.replace(/\s/g, '').length).map((s) => s.match(/^\s*/)[0].length)
    );
    return str.map((x) => x.slice(minLen)).join('\n');
  };
  const joinStrProp = (str, prop) => {
    var pre = str.split('\n').slice(-1)[0].replace(/./g, ' ');
    return (
      str +
      (prop + '')
        .split('\n')
        .map((x, i) => (i ? pre : '') + x)
        .join('\n')
    );
  };
  str = str.map((x) => x.replace(/\r/g, ''));
  str = str.reduce((a, s, i) => a + joinStrProp(s, props[i] || ''), '');
  return doUndent(str);
}
