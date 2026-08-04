import fs from 'fs';

const files = [];

files.push({
    name: 'README.md',
    content: fs.readFileSync('./README.md', 'utf-8')
})

for (const fn of fs.readdirSync('./docs')) {
    if (fn === 'drafts') continue;
    const content = fs.readFileSync(`./docs/${fn}`, 'utf-8');
    files.push({
        name: `docs/${fn}`,
        content
    });
}

const output = [];
for (const entry of files) {
    output.push('---');
    output.push(`${entry.name}`);
    output.push('---');
    output.push('');
    output.push(entry.content);
    output.push('');
}

fs.writeFileSync('./combined-docs.txt', output.join('\n'));
