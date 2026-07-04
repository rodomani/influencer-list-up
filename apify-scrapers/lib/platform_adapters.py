import importlib
import importlib.util
import sys
from pathlib import Path
from typing import Any, Dict


class PlatformModuleLoader:
    def __init__(self, root_dir: Path, module_dir_by_platform: Dict[str, str]):
        self.root_dir = root_dir
        self.module_dir_by_platform = module_dir_by_platform
        self.cache: Dict[str, Any] = {}

    def import_module(self, platform: str, module_name: str):
        cache_key = f"{platform}:{module_name}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        module_dir = self.root_dir / self.module_dir_by_platform[platform]
        module_dir_str = str(module_dir)
        if module_dir_str not in sys.path:
            sys.path.insert(0, module_dir_str)
        module = importlib.import_module(module_name)
        self.cache[cache_key] = module
        return module

    def load_from_path(self, platform: str, module_path: Path):
        cache_key = f"{platform}:{module_path}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        module_dir = str(module_path.parent)
        if module_dir not in sys.path:
            sys.path.insert(0, module_dir)
        module_name = f"platform_adapter_{platform}"
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"Could not load platform module: {module_path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.cache[cache_key] = module
        return module
