def evaluate_compliance(configuration_item, valid_rule_parameters):
    """Check if resource has required cost allocation tags
    
    Required tags:
    - Project
    - Environment
    - Cost Center
    """
    required_tags = ["Project", "Environment", "Cost Center"]
    
    # Get tags from configuration item
    tags = configuration_item.get("configuration", {}).get("tags", {})
    
    # Handle different tag formats
    if isinstance(tags, list):
        # Tags as list of dicts with Key/Value
        tag_keys = [tag.get("key") or tag.get("Key") for tag in tags]
    elif isinstance(tags, dict):
        # Tags as dictionary
        tag_keys = list(tags.keys())
    else:
        # No tags found
        return "NON_COMPLIANT"
    
    # Check if all required tags are present
    missing_tags = [tag for tag in required_tags if tag not in tag_keys]
    
    if missing_tags:
        return "NON_COMPLIANT"
    
    return "COMPLIANT"
