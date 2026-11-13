---
engine: patch
---
The file facts report's format id is now `prism3-file-facts/0.1`, marked unstable (owner decision D3685.1 C, #2075).
While it reads 0.x, any field may be added, renamed or removed before part 2 settles the shape, and each such change
raises the number after the dot. The schema says so in its description and on `format`. No emitted artifact changes.
