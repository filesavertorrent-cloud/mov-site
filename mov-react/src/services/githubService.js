const BASE_URL = 'https://api.github.com';

export const getRepoContent = async (pat, owner, repo, path) => {
    const response = await fetch(`${BASE_URL}/repos/${owner}/${repo}/contents/${path}?t=${Date.now()}`, {
        headers: {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
};

export const updateRepoContent = async (pat, owner, repo, path, content, sha, message) => {
    const body = {
        message: message,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
        sha: sha,
        branch: 'main'
    };

    const response = await fetch(`${BASE_URL}/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`GitHub Update Error: ${response.status} - ${err.message}`);
    }
    return await response.json();
};

export const uploadImageToRepo = async (pat, owner, repo, file) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = async () => {
            const base64Content = reader.result.split(",")[1];
            const filename = `poster_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
            const path = `images/${filename}`;

            try {
                const res = await fetch(`${BASE_URL}/repos/${owner}/${repo}/contents/${path}`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `token ${pat}`,
                        "Content-Type": "application/json",
                        "Accept": "application/vnd.github.v3+json"
                    },
                    body: JSON.stringify({
                        message: `Upload ${filename}`,
                        content: base64Content,
                        branch: "main"
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    resolve(data.content.download_url);
                } else {
                    const err = await res.json();
                    reject(new Error(err.message));
                }
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
