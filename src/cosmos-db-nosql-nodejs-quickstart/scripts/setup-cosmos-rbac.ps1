# Set variables
$resourceGroupName = ""
$accountName = ""
$roleName = "AllActionsRole"
$principalId = ""

# Create role definition

$roleDefinition = @"
{
    "RoleName": "$roleName",
    "Type": "CustomRole",
    "AssignableScopes": ["/"],
    "Permissions": [{
        "DataActions": [
           "Microsoft.DocumentDB/databaseAccounts/readMetadata",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/create",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/read",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/delete",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/upsert",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/replace",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/executeQuery",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/write",
           "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/write"
        ]
    }]
}
"@

$roleDefinition | Out-File -FilePath ./role-definition.json

# Create the role
az cosmosdb sql role definition create --account-name $accountName --resource-group $resourceGroupName --body "@role-definition.json"

$roleDefinitionId=$(az cosmosdb sql role definition list --account-name $accountName --resource-group $resourceGroupName --query "[?roleName=='AllActionsRole'].name" --output tsv)

# Assign the role
az cosmosdb sql role assignment create --account-name $accountName --resource-group $resourceGroupName --scope "/" --principal-id $principalId --role-definition-id $roleDefinitionId
