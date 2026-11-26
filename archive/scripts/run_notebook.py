import nbformat
from nbclient import NotebookClient

def execute_notebook(path):
    print(f"Executing {path}...")
    with open(path, 'r', encoding='utf-8') as f:
        nb = nbformat.read(f, as_version=4)
    client = NotebookClient(nb, timeout=600, kernel_name='python3')
    client.execute()
    with open(path, 'w', encoding='utf-8') as f:
        nbformat.write(nb, f)
    print(f"Successfully executed and saved {path}!")

if __name__ == '__main__':
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else 'notebooks/03_tributary_ml_analysis.ipynb'
    execute_notebook(target)
