const {Repo} = require('hypermerge');
const Hyperswarm = require('hyperswarm');
var express = require('express');

function getSwarm() {
  return Hyperswarm({
    queue: {
      multiplex: true,
    },
  });
}

function strip(url) {
  let u = url.split('?')[0];
  return u.includes('/') ? u.split('/')[1] : u;
}

const cache = {};
const repo = new Repo({memory: true});
repo.addSwarm(getSwarm(), {announce: true});

watch = boardId => {
  cache[boardId] ||
    repo.watch(boardId, board => {
      cache[boardId] = board;
      const {cards} = board;
      const urls = Object.values(cards)
        .map(c => strip(c.url))
        .filter(url => !(url in cache));
      urls.map(url => {
        cache[url] = null;
        repo.watch(url, d => {
          cache[url] = d;
        });
      });
    });
};

function render_card(card) {
  return `<div style="width: ${card.width}px; 
                      background: white; 
                      height: ${card.height}px; 
                      position: fixed; 
                      top: ${card.y}px;
                      overflow: scroll;
                      left: ${card.x}px">${render(card.url)}</div>`;
}

function render(url) {
  const content = cache[strip(url)];
  if (!content) {
    return 'still peering, refresh?';
  }
  if (content.cards) {
    let body = Object.values(content.cards)
      .map(card => render_card(card))
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${content.title}</title></head><body bgcolor="${content.backgroundColor}">${body}</body></html>`;
  }
  if (content.videoId) {
    return `<img src="https://i1.ytimg.com/vi/${content.videoId}/mqdefault.jpg" />`;
  }
  if (content.text) {
    return `<pre>${content.text}</pre>`;
  }
  if (content.messages) {
    return content.messages.map(m => m.content).join('<br>');
  }

  return JSON.stringify(content);
}

var app = express();

app.get('/', function(req, res) {
  res.send(
    `<input style="font-size: 300%; width: 90%" type="text" placeholder="pushin boardId" onchange="window.location.pathname=(this.value.split('/')[1]||this.value).split('?')[0]"></input>`
  );
});

app.get('/:boardId', (req, res) => {
  const boardId = strip(req.params.boardId);
  watch(boardId);
  res.send(render(boardId));
});

var server = app.listen(process.env.PORT || 8081, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
